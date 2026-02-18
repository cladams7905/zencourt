/**
 * Image Processor Service
 *
 * Coordinates the AI analysis workflow for property images:
 * - Analyze via AI vision
 * - Categorize results
 * - Generate statistics
 */

import visionService from "../vision";
import storageService from "../storage";
import type {
  SerializableImageData,
  ProcessingPhase,
  ProcessingProgress
} from "@web/src/lib/domain/listing/images";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { ProcessingResult } from "./types";
import {
  calculateProcessingStats,
  categorizeAnalyzedImages,
  cloneSerializableImages
} from "./domain/results";

type ProgressCallback = (progress: ProcessingProgress) => void;

type VisionServiceLike = {
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
  getSignedDownloadUrl: (
    urlOrKey: string,
    expiresIn?: number
  ) => Promise<
    { success: true; url: string } | { success: false; error: string }
  >;
};

type ImageProcessorDeps = {
  vision?: VisionServiceLike;
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

const processorLogger = createChildLogger(baseLogger, {
  module: "image-processor-service"
});

export class ImageProcessingError extends Error {
  constructor(
    message: string,
    public phase: ProcessingPhase,
    public details?: unknown
  ) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

export class ImageProcessorService {
  private readonly logger = processorLogger;
  private readonly vision: VisionServiceLike;
  private readonly storage: StorageServiceLike;

  constructor(deps: ImageProcessorDeps = {}) {
    this.vision = deps.vision ?? visionService;
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
  ): Promise<ProcessingResult> {
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

      throw new ImageProcessingError(
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
      throw new ImageProcessingError(
        "No images successfully uploaded for analysis",
        "analyzing"
      );
    }

    const imageById = new Map(uploadedImages.map((img) => [img.id, img]));
    const analyzableTargets = await this.buildAnalyzableTargets(
      uploadedImages,
      imageById
    );

    if (analyzableTargets.length === 0) {
      throw new ImageProcessingError(
        "No accessible images available for analysis",
        "analyzing"
      );
    }

    const urlToImageId = new Map(
      analyzableTargets.map(({ signedUrl, imageId }) => [signedUrl, imageId])
    );
    const signedImageUrls = analyzableTargets.map((target) => target.signedUrl);

    await this.vision.classifyRoomBatch(signedImageUrls, {
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

  private async getSignedImageUrl(
    image: SerializableImageData,
    purpose: "classification",
    expiresInSeconds = 600
  ): Promise<string | null> {
    if (!image.url) {
      this.logger.error(
        { imageId: image.id, purpose },
        "Missing image URL for signed access"
      );
      return null;
    }

    const result = await this.storage.getSignedDownloadUrl(
      image.url,
      expiresInSeconds
    );

    if (!result.success) {
      this.logger.error(
        { imageId: image.id, purpose, error: result.error },
        "Failed to generate signed download URL"
      );
      return null;
    }

    return result.url;
  }

  private emitProgress(
    callback: ProgressCallback | undefined,
    phase: ProcessingPhase,
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

  private async buildAnalyzableTargets(
    uploadedImages: SerializableImageData[],
    imageById: Map<string, SerializableImageData>
  ): Promise<AnalyzableTarget[]> {
    const targets = await Promise.all(
      uploadedImages.map(async (image) => {
        const signedUrl = await this.getSignedImageUrl(image, "classification");
        if (!signedUrl) {
          imageById.set(image.id, {
            ...image,
            status: "error",
            error: image.error || "Unable to access image for analysis"
          });
          return null;
        }
        return { imageId: image.id, signedUrl };
      })
    );

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

const imageProcessorServiceInstance = new ImageProcessorService();
export default imageProcessorServiceInstance;
