import { and, db, eq, inArray, listingImages } from "@db/client";
import type {
  CategorizationPhase,
  CategorizationProgress,
  SerializableImageData
} from "@web/src/lib/domain/listing/images";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { getListingById } from "@web/src/server/models/listings";
import { assignPrimaryListingImageForCategoryTrusted } from "@web/src/server/models/listingImages";
import roomClassificationService from "@web/src/server/services/roomClassification";
import type { CategorizationResult } from "./domain/types";
import type { ImageCategorizationStats } from "./types";
import storageService from "@web/src/server/services/storage";
import {
  calculateProcessingStats,
  categorizeAnalyzedImages,
  cloneSerializableImages
} from "./domain/results";

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
    logger.error({ imageId: image.id }, "Missing image URL for room classification");
    return null;
  }
  const publicUrl = storageService.getPublicUrlForStorageUrl(image.url);
  return publicUrl ?? image.url;
}

function mapBatchResultToImage(
  image: SerializableImageData,
  batchResult: {
    success: boolean;
    classification: {
      category: string;
      confidence: number;
      primaryScore?: number;
      perspective?: "aerial" | "ground";
    } | null;
    error: string | null;
  }
): SerializableImageData {
  if (!batchResult.success || !batchResult.classification) {
    return {
      ...image,
      status: "error",
      error: batchResult.error || "Analysis failed"
    };
  }

  const isOther = batchResult.classification.category === "other";
  let nextImage: SerializableImageData = {
    ...image,
    category: isOther ? null : batchResult.classification.category,
    confidence: batchResult.classification.confidence,
    primaryScore: isOther ? null : (batchResult.classification.primaryScore ?? null),
    status: "analyzed"
  };

  if (batchResult.classification.perspective) {
    nextImage = {
      ...nextImage,
      metadata: {
        ...(image.metadata ?? {
          width: 0,
          height: 0,
          format: "",
          size: 0,
          lastModified: 0
        }),
        perspective: batchResult.classification.perspective
      }
    };
  }

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
        error: image.error || "Unable to access image for analysis"
      });
      return null;
    }
    return { imageId: image.id, signedUrl: imageUrl };
  });

  return targets.filter((target): target is AnalyzableTarget => Boolean(target));
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
  const { onProgress, aiConcurrency = 10 } = options;
  const startTime = Date.now();

  const analyzedImages = await analyzeImages(
    imageDataList,
    aiConcurrency,
    createAnalyzeProgressReporter(onProgress)
  );

  emitProgress(onProgress, "categorizing", 0, 1, 95);

  const normalizedImages = cloneSerializableImages(analyzedImages);
  const categorized = categorizeAnalyzedImages(normalizedImages);
  const stats = calculateProcessingStats(normalizedImages, Date.now() - startTime);

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
    primaryScore: image.primaryScore ?? null,
    status: "uploaded",
    isPrimary: image.isPrimary ?? false,
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
      primaryScore: image.primaryScore ?? null,
      metadata: image.metadata ?? undefined
    })
    .where(
      and(eq(listingImages.id, image.id), eq(listingImages.listingId, listingId))
    );
}

async function assignPrimaryImagesByCategory(
  listingId: string,
  categories: string[]
): Promise<void> {
  const uniqueCategories = Array.from(
    new Set(categories.filter((c) => c.trim() !== ""))
  );
  if (uniqueCategories.length === 0) return;
  await Promise.all(
    uniqueCategories.map((category) =>
      assignPrimaryListingImageForCategoryTrusted(listingId, category)
    )
  );
}

function buildNoopStats(uploaded: number, analyzed: number): ImageCategorizationStats {
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
  const needsAnalysis = images.filter((img) => !img.category);

  if (needsAnalysis.length === 0) {
    return buildNoopStats(images.length, images.length);
  }

  const serializableImages = needsAnalysis.map(toSerializableImageData);
  const result = await runAnalyzeImagesWorkflow(serializableImages, {
    aiConcurrency: options.aiConcurrency,
    onProgress: (progress) => {
      if (progress.currentImage) {
        void persistListingImageAnalysis(listingId, progress.currentImage);
      }
    }
  });

  await Promise.all(result.images.map((image) => persistListingImageAnalysis(listingId, image)));

  await assignPrimaryImagesByCategory(
    listingId,
    result.images
      .map((image) => image.category ?? "")
      .filter((category) => category !== "")
  );

  return result.stats;
}
