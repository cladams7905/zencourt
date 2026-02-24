/**
 * Image Categorization Service
 *
 * Coordinates the AI analysis workflow for property images:
 * - Analyze via Room Classification Service
 * - Categorize results
 * - Generate statistics
 */

import roomClassificationService from "./roomClassification";
import storageService from "../storage";
import type {
  SerializableImageData,
  CategorizationPhase,
  CategorizationProgress
} from "@web/src/lib/domain/listing/images";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { CategorizationResult } from "./types";
import {
  calculateProcessingStats,
  categorizeAnalyzedImages,
  cloneSerializableImages
} from "./domain/results";

type ProgressCallback = (progress: CategorizationProgress) => void;

type RoomClassificationLike = {
  classifyRoomBatch: (
    imageUrls: string[],
    options?: {
      concurrency?: number;
      timeout?: number;
      maxRetries?: number;
      onProgress?: (
        completed: number,
        total: number,
        result: {
          imageUrl: string;
          success: boolean;
          classification: {
            category: string;
            confidence: number;
            primaryScore?: number;
            perspective?: "aerial" | "ground";
          } | null;
          error: string | null;
          duration: number;
        }
      ) => void;
    }
  ) => Promise<
    Array<{
      imageUrl: string;
      success: boolean;
      classification: {
        category: string;
        confidence: number;
        primaryScore?: number;
        perspective?: "aerial" | "ground";
      } | null;
      error: string | null;
      duration: number;
    }>
  >;
};

type StorageServiceLike = {
  getPublicUrlForStorageUrl: (url: string) => string | null;
};

type ImageCategorizationDeps = {
  roomClassification?: RoomClassificationLike;
  storage?: StorageServiceLike;
};

type AnalyzeProgressCallback = (
  completed: number,
  total: number,
  result: SerializableImageData
) => void;

type AnalyzableTarget = {
  imageId: string;
  signedUrl: string;
};

const categorizationLogger = createChildLogger(baseLogger, {
  module: "image-categorization-service"
});

export class ImageCategorizationError extends Error {
  constructor(
    message: string,
    public phase: CategorizationPhase,
    public details?: unknown
  ) {
    super(message);
    this.name = "ImageCategorizationError";
  }
}

export class ImageCategorizationService {
  private readonly logger = categorizationLogger;
  private readonly roomClassification: RoomClassificationLike;
  private readonly storage: StorageServiceLike;

  constructor(deps: ImageCategorizationDeps = {}) {
    this.roomClassification =
      deps.roomClassification ?? roomClassificationService;
    this.storage = deps.storage ?? storageService;
  }

  /**
   * Analyze images workflow: Classification → Categorization
   * Expects images to already be uploaded with url set
   * Accepts serializable image data (no File objects or blob URLs)
   */
  public async analyzeImagesWorkflow(
    imageDataList: SerializableImageData[],
    options: {
      onProgress?: ProgressCallback;
      aiConcurrency?: number;
    } = {}
  ): Promise<CategorizationResult> {
    const { onProgress, aiConcurrency = 10 } = options;
    const startTime = Date.now();

    this.logger.info(
      { totalImages: imageDataList.length },
      "Starting image analysis workflow"
    );

    try {
      const analyzedImages = await this.analyzeImages(
        imageDataList,
        aiConcurrency,
        this.createAnalyzeProgressReporter(onProgress)
      );

      this.emitProgress(onProgress, "categorizing", 0, 1, 95);

      // Create completely new objects to avoid React Server Actions reference reuse
      // This ensures that mutations made during analysis are preserved in the return value
      const normalizedImages = cloneSerializableImages(analyzedImages);

      const categorized = categorizeAnalyzedImages(normalizedImages);
      const stats = calculateProcessingStats(
        normalizedImages,
        Date.now() - startTime
      );

      this.emitProgress(
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
    } catch (error) {
      this.emitProgress(onProgress, "error", 0, imageDataList.length, 0);

      this.logger.error(
        {
          error:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : error
        },
        "Image analysis workflow failed"
      );

      throw new ImageCategorizationError(
        `Image analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        "error",
        error
      );
    }
  }

  private async analyzeImages(
    images: SerializableImageData[],
    concurrency: number,
    onProgress?: AnalyzeProgressCallback
  ): Promise<SerializableImageData[]> {
    const uploadedImages = this.getUploadedImagesForAnalysis(images);

    if (uploadedImages.length === 0) {
      throw new ImageCategorizationError(
        "No images successfully uploaded for analysis",
        "analyzing"
      );
    }

    const imageById = new Map(uploadedImages.map((img) => [img.id, img]));
    const analyzableTargets = this.buildAnalyzableTargets(
      uploadedImages,
      imageById
    );

    if (analyzableTargets.length === 0) {
      throw new ImageCategorizationError(
        "No accessible images available for analysis",
        "analyzing"
      );
    }

    const urlToImageId = new Map(
      analyzableTargets.map(({ signedUrl, imageId }) => [signedUrl, imageId])
    );
    const signedImageUrls = analyzableTargets.map((target) => target.signedUrl);

    await this.roomClassification.classifyRoomBatch(signedImageUrls, {
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

        const nextImage = this.mapBatchResultToImage(image, batchResult);

        imageById.set(image.id, nextImage);

        onProgress?.(completed, total, { ...nextImage });
      }
    });

    return uploadedImages.map((image) => imageById.get(image.id) ?? image);
  }

  private getPublicImageUrl(image: SerializableImageData): string | null {
    if (!image.url) {
      this.logger.error(
        { imageId: image.id },
        "Missing image URL for room classification"
      );
      return null;
    }
    const publicUrl = this.storage.getPublicUrlForStorageUrl(image.url);
    return publicUrl ?? image.url;
  }

  private emitProgress(
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

  private createAnalyzeProgressReporter(
    callback?: ProgressCallback
  ): AnalyzeProgressCallback | undefined {
    if (!callback) {
      return undefined;
    }
    return (completed, total, result) => {
      this.emitProgress(
        callback,
        "analyzing",
        completed,
        total,
        (completed / total) * 90,
        result
      );
    };
  }

  private getUploadedImagesForAnalysis(
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

  private buildAnalyzableTargets(
    uploadedImages: SerializableImageData[],
    imageById: Map<string, SerializableImageData>
  ): AnalyzableTarget[] {
    const targets = uploadedImages.map((image) => {
      const imageUrl = this.getPublicImageUrl(image);
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

    return targets.filter((target): target is AnalyzableTarget =>
      Boolean(target)
    );
  }

  private mapBatchResultToImage(
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
      primaryScore: isOther
        ? null
        : (batchResult.classification.primaryScore ?? null),
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
}

const imageCategorizationService = new ImageCategorizationService();
export default imageCategorizationService;
