import { randomUUID } from "node:crypto";
import { and, db, eq, inArray, listingImages, lt, or } from "@db/client";
import type {
  ImageMetadata,
  ListingImageAiScores,
  ListingImageAnalysisStatus,
  ListingImageShotType
} from "@shared/types/models";
import type {
  CategorizationPhase,
  CategorizationProgress,
  SerializableImageData
} from "@web/src/lib/domain/listings/image/types";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { getListingById } from "@web/src/server/models/listings";
import roomClassificationService from "@web/src/server/services/roomClassification";
import type { CategorizationResult } from "./domain/types";
import type { ImageCategorizationStats } from "./types";
import storageService from "@web/src/server/services/storage";
import {
  calculateProcessingStats,
  categorizeAnalyzedImages,
  cloneSerializableImages
} from "./domain/results";
import { calculateRecommendationBreakdown } from "./domain/scoring";

type ProgressCallback = (progress: CategorizationProgress) => void;

type AnalyzeProgressCallback = (
  completed: number,
  total: number,
  result: SerializableImageData
) => void;

type AnalyzableTarget = {
  imageId: string;
  signedUrl: string;
};

const logger = createChildLogger(baseLogger, {
  module: "image-categorization-actions"
});

type ListingImageRow = typeof listingImages.$inferSelect;
const ANALYSIS_STALE_MS = 10 * 60 * 1000;
const DEFAULT_AI_CONCURRENCY = 5;

type BatchClassificationPayload = {
  category: string;
  confidence: number;
  shotType: ListingImageShotType;
  featureTags: string[];
  scores: ListingImageAiScores;
  perspective?: "aerial" | "ground";
};

function emitProgress(
  callback: ProgressCallback | undefined,
  phase: CategorizationPhase,
  completed: number,
  total: number,
  overallProgress: number,
  currentImage?: SerializableImageData
): void {
  callback?.({
    phase,
    completed,
    total,
    overallProgress,
    currentImage
  });
}

function createAnalyzeProgressReporter(
  callback?: ProgressCallback
): AnalyzeProgressCallback | undefined {
  if (!callback) {
    return undefined;
  }
  return (completed, total, result) => {
    emitProgress(
      callback,
      "analyzing",
      completed,
      total,
      (completed / total) * 90,
      result
    );
  };
}

function getUploadedImagesForAnalysis(
  images: SerializableImageData[]
): SerializableImageData[] {
  return images
    .filter(
      (img) =>
        img.url &&
        (img.status === "uploaded" ||
          img.status === "analyzed" ||
          img.status === "analyzing")
    )
    .map((img) => ({
      ...img,
      status: "analyzing"
    }));
}

function getPublicImageUrl(image: SerializableImageData): string | null {
  if (!image.url) {
    logger.error(
      { imageId: image.id },
      "Missing image URL for room classification"
    );
    return null;
  }
  const publicUrl = storageService.getPublicUrlForStorageUrl(image.url);
  return publicUrl ?? image.url;
}

function buildNextMetadata(args: {
  image: SerializableImageData;
  perspective?: "aerial" | "ground";
  featureTags?: string[];
  detailType?: string;
  scoreBreakdown?: ImageMetadata["scoreBreakdown"];
  analysisError?: string | null;
}): ImageMetadata {
  const existing = args.image.metadata ?? {
    width: 0,
    height: 0,
    format: "",
    size: 0,
    lastModified: 0
  };

  return {
    ...existing,
    analysisVersion: "2026-04-01.1",
    perspective: args.perspective ?? existing.perspective,
    featureTags: args.featureTags ?? existing.featureTags,
    detailType: args.detailType ?? existing.detailType,
    scoreBreakdown: args.scoreBreakdown ?? existing.scoreBreakdown,
    analysisError:
      args.analysisError === undefined
        ? (existing.analysisError ?? null)
        : args.analysisError
  };
}

function mapBatchResultToImage(
  image: SerializableImageData,
  batchResult: {
    success: boolean;
    classification: BatchClassificationPayload | null;
    error: string | null;
  }
): SerializableImageData {
  if (!batchResult.success || !batchResult.classification) {
    return {
      ...image,
      status: "error",
      analysisStatus: "failed",
      analysisRunId: null,
      analysisCompletedAt: new Date(),
      metadata: buildNextMetadata({
        image,
        analysisError: batchResult.error || "Analysis failed"
      }),
      error: batchResult.error || "Analysis failed"
    };
  }

  const { classification } = batchResult;
  const scoreBreakdown = calculateRecommendationBreakdown({
    metadata: image.metadata,
    scores: classification.scores,
    shotType: classification.shotType,
    confidence: classification.confidence
  });
  let nextImage: SerializableImageData = {
    ...image,
    category: classification.category,
    confidence: classification.confidence,
    recommendationScore: scoreBreakdown.total,
    shotType: classification.shotType,
    analysisStatus: "complete",
    analysisRunId: null,
    analysisCompletedAt: new Date(),
    status: "analyzed",
    metadata: buildNextMetadata({
      image,
      perspective: classification.perspective,
      featureTags: classification.featureTags,
      detailType:
        classification.shotType === "detail"
          ? classification.featureTags[0]
          : undefined,
      scoreBreakdown,
      analysisError: null
    })
  };

  return nextImage;
}

function buildAnalyzableTargets(
  uploadedImages: SerializableImageData[],
  imageById: Map<string, SerializableImageData>
): AnalyzableTarget[] {
  const targets = uploadedImages.map((image) => {
    const imageUrl = getPublicImageUrl(image);
    if (!imageUrl) {
      imageById.set(image.id, {
        ...image,
        status: "error",
        analysisStatus: "failed",
        analysisRunId: null,
        analysisCompletedAt: new Date(),
        metadata: buildNextMetadata({
          image,
          analysisError: image.error || "Unable to access image for analysis"
        }),
        error: image.error || "Unable to access image for analysis"
      });
      return null;
    }
    return { imageId: image.id, signedUrl: imageUrl };
  });

  return targets.filter((target): target is AnalyzableTarget =>
    Boolean(target)
  );
}

async function analyzeImages(
  images: SerializableImageData[],
  concurrency: number,
  onProgress?: AnalyzeProgressCallback
): Promise<SerializableImageData[]> {
  const uploadedImages = getUploadedImagesForAnalysis(images);
  if (uploadedImages.length === 0) {
    throw new Error("No images successfully uploaded for analysis");
  }

  const imageById = new Map(uploadedImages.map((img) => [img.id, img]));
  const analyzableTargets = buildAnalyzableTargets(uploadedImages, imageById);
  if (analyzableTargets.length === 0) {
    throw new Error("No accessible images available for analysis");
  }

  const urlToImageId = new Map(
    analyzableTargets.map(({ signedUrl, imageId }) => [signedUrl, imageId])
  );

  await roomClassificationService.classifyRoomBatch(
    analyzableTargets.map((target) => target.signedUrl),
    {
      concurrency,
      onProgress: (completed, total, batchResult) => {
        const imageId = urlToImageId.get(batchResult.imageUrl);
        if (!imageId) {
          return;
        }
        const image = imageById.get(imageId);
        if (!image) {
          return;
        }

        const nextImage = mapBatchResultToImage(image, batchResult);
        imageById.set(image.id, nextImage);
        onProgress?.(completed, total, { ...nextImage });
      }
    }
  );

  return uploadedImages.map((image) => imageById.get(image.id) ?? image);
}

export async function runAnalyzeImagesWorkflow(
  imageDataList: SerializableImageData[],
  options: {
    onProgress?: ProgressCallback;
    aiConcurrency?: number;
  } = {}
): Promise<CategorizationResult> {
  const { onProgress, aiConcurrency = DEFAULT_AI_CONCURRENCY } = options;
  const startTime = Date.now();

  const analyzedImages = await analyzeImages(
    imageDataList,
    aiConcurrency,
    createAnalyzeProgressReporter(onProgress)
  );

  emitProgress(onProgress, "categorizing", 0, 1, 95);

  const normalizedImages = cloneSerializableImages(analyzedImages);
  const categorized = categorizeAnalyzedImages(normalizedImages);
  const stats = calculateProcessingStats(
    normalizedImages,
    Date.now() - startTime
  );

  emitProgress(
    onProgress,
    "complete",
    analyzedImages.length,
    analyzedImages.length,
    100
  );

  return {
    images: normalizedImages,
    stats,
    categorized
  };
}

export async function loadListingImagesForWorkflow(
  listingId: string,
  imageIds?: string[]
): Promise<ListingImageRow[]> {
  if (imageIds && imageIds.length > 0) {
    return db
      .select()
      .from(listingImages)
      .where(
        and(
          eq(listingImages.listingId, listingId),
          inArray(listingImages.id, imageIds)
        )
      );
  }
  return db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId));
}

export function toSerializableImageData(
  image: ListingImageRow
): SerializableImageData {
  return {
    id: image.id,
    listingId: image.listingId,
    url: image.url,
    filename: image.filename,
    category: image.category ?? null,
    confidence: image.confidence ?? null,
    recommendationScore: image.recommendationScore ?? null,
    status: "uploaded",
    shotType: image.shotType,
    analysisStatus: image.analysisStatus,
    analysisRunId: image.analysisRunId ?? null,
    analysisStartedAt: image.analysisStartedAt ?? null,
    analysisCompletedAt: image.analysisCompletedAt ?? null,
    metadata: image.metadata ?? null,
    error: undefined,
    uploadUrl: undefined
  };
}

export async function persistListingImageAnalysis(
  listingId: string,
  image: SerializableImageData
): Promise<void> {
  await db
    .update(listingImages)
    .set({
      category: image.category ?? null,
      confidence: image.confidence ?? null,
      recommendationScore: image.recommendationScore ?? null,
      shotType: image.shotType ?? "room",
      analysisStatus: (image.analysisStatus ??
        "pending") as ListingImageAnalysisStatus,
      analysisRunId: image.analysisRunId ?? null,
      analysisStartedAt: image.analysisStartedAt ?? null,
      analysisCompletedAt: image.analysisCompletedAt ?? null,
      metadata: image.metadata ?? undefined
    })
    .where(
      and(
        eq(listingImages.id, image.id),
        eq(listingImages.listingId, listingId)
      )
    );
}

function buildNoopStats(
  uploaded: number,
  analyzed: number
): ImageCategorizationStats {
  return {
    total: 0,
    uploaded,
    analyzed,
    failed: 0,
    successRate: 100,
    avgConfidence: 0,
    totalDuration: 0
  };
}

function getClaimableImages(
  images: ListingImageRow[],
  staleBefore: Date
): ListingImageRow[] {
  return images.filter((image) => {
    if (image.analysisStatus === "pending") {
      return true;
    }
    if (
      image.analysisStatus === "processing" &&
      image.analysisStartedAt &&
      image.analysisStartedAt < staleBefore
    ) {
      return true;
    }
    return false;
  });
}

async function claimListingImagesForAnalysis(params: {
  listingId: string;
  imageIds?: string[];
  runId: string;
  staleBefore: Date;
}): Promise<ListingImageRow[]> {
  const { listingId, imageIds, runId, staleBefore } = params;

  await db
    .update(listingImages)
    .set({
      analysisStatus: "processing",
      analysisRunId: runId,
      analysisStartedAt: new Date(),
      analysisCompletedAt: null
    })
    .where(
      and(
        eq(listingImages.listingId, listingId),
        ...(imageIds && imageIds.length > 0
          ? [inArray(listingImages.id, imageIds)]
          : []),
        or(
          eq(listingImages.analysisStatus, "pending"),
          and(
            eq(listingImages.analysisStatus, "processing"),
            lt(listingImages.analysisStartedAt, staleBefore)
          )
        )
      )
    );

  return db
    .select()
    .from(listingImages)
    .where(
      and(
        eq(listingImages.listingId, listingId),
        eq(listingImages.analysisRunId, runId)
      )
    );
}

export async function runListingImagesCategorizationWorkflow(
  userId: string,
  listingId: string,
  options: { aiConcurrency?: number } = {},
  imageIds?: string[]
): Promise<ImageCategorizationStats> {
  const listing = await getListingById(userId, listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  const images = await loadListingImagesForWorkflow(listingId, imageIds);
  const staleBefore = new Date(Date.now() - ANALYSIS_STALE_MS);
  const claimableImages = getClaimableImages(images, staleBefore);

  if (claimableImages.length === 0) {
    const analyzed = images.filter((img) => img.analysisStatus === "complete").length;
    return buildNoopStats(images.length, analyzed);
  }

  const runId = randomUUID();
  const claimedImages = await claimListingImagesForAnalysis({
    listingId,
    imageIds: claimableImages.map((image) => image.id),
    runId,
    staleBefore
  });

  if (claimedImages.length === 0) {
    const analyzed = images.filter((img) => img.analysisStatus === "complete").length;
    return buildNoopStats(images.length, analyzed);
  }

  const serializableImages = claimedImages.map(toSerializableImageData);
  const result = await runAnalyzeImagesWorkflow(serializableImages, {
    aiConcurrency: options.aiConcurrency,
    onProgress: (progress) => {
      if (progress.currentImage) {
        void persistListingImageAnalysis(listingId, progress.currentImage);
      }
    }
  });

  await Promise.all(
    result.images.map((image) => persistListingImageAnalysis(listingId, image))
  );

  return result.stats;
}
