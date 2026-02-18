/**
 * Image Processor Service
 *
 * Coordinates the AI analysis workflow for property images:
 * - Analyze via AI vision
 * - Categorize results
 * - Generate statistics
 */

import visionService from "./visionService";
import storageService from "./storageService";
import type {
  ProcessedImage,
  SerializableImageData,
  ProcessingPhase,
  ProcessingProgress
} from "../../types/images";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";

type ProgressCallback = (progress: ProcessingProgress) => void;

export interface CategorizedImages {
  [category: string]: SerializableImageData[];
}

export interface ProcessingResult {
  images: SerializableImageData[];
  stats: {
    total: number;
    uploaded: number;
    analyzed: number;
    failed: number;
    successRate: number;
    avgConfidence: number;
    totalDuration: number;
  };
  categorized: CategorizedImages;
}

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

export class imageProcessorService {
  private readonly logger = processorLogger;

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
        (completed, total, result) => {
          onProgress?.({
            phase: "analyzing",
            completed,
            total,
            overallProgress: (completed / total) * 90,
            currentImage: result
          });
        }
      );

      onProgress?.({
        phase: "categorizing",
        completed: 0,
        total: 1,
        overallProgress: 95
      });

      // Create completely new objects to avoid React Server Actions reference reuse
      // This ensures that mutations made during analysis are preserved in the return value
      const normalizedImages: SerializableImageData[] = analyzedImages.map(
        (image) => ({
          id: image.id,
          listingId: image.listingId,
          url: image.url,
          filename: image.filename,
          category: image.category,
          confidence: image.confidence,
          primaryScore: image.primaryScore ?? null,
          status: image.status,
          isPrimary: image.isPrimary,
          metadata: image.metadata,
          error: image.error,
          uploadUrl: image.uploadUrl
        })
      );

      const categorized = this.categorizeImages(normalizedImages);
      const stats = this.calculateStats(
        normalizedImages,
        Date.now() - startTime
      );

      onProgress?.({
        phase: "complete",
        completed: analyzedImages.length,
        total: analyzedImages.length,
        overallProgress: 100
      });

      return {
        images: normalizedImages,
        stats,
        categorized
      };
    } catch (error) {
      onProgress?.({
        phase: "error",
        completed: 0,
        total: imageDataList.length,
        overallProgress: 0
      });

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
    onProgress?: (
      completed: number,
      total: number,
      result: SerializableImageData
    ) => void
  ): Promise<SerializableImageData[]> {
    const uploadedImages = images.filter(
      (img) =>
        img.url &&
        (img.status === "uploaded" ||
          img.status === "analyzed" ||
          img.status === "analyzing")
    );

    if (uploadedImages.length === 0) {
      throw new ImageProcessingError(
        "No images successfully uploaded for analysis",
        "analyzing"
      );
    }

    uploadedImages.forEach((img) => {
      img.status = "analyzing";
    });

    const analyzableTargets = (
      await Promise.all(
        uploadedImages.map(async (image) => {
          const signedUrl = await this.getSignedImageUrl(
            image,
            "classification"
          );

          if (!signedUrl) {
            image.status = "error";
            image.error = image.error || "Unable to access image for analysis";
            return null;
          }

          return { image, signedUrl };
        })
      )
    ).filter(Boolean) as { image: ProcessedImage; signedUrl: string }[];

    if (analyzableTargets.length === 0) {
      throw new ImageProcessingError(
        "No accessible images available for analysis",
        "analyzing"
      );
    }

    const urlToImage = new Map(
      analyzableTargets.map(({ signedUrl, image }) => [signedUrl, image])
    );
    const signedImageUrls = analyzableTargets.map((target) => target.signedUrl);

    await visionService.classifyRoomBatch(signedImageUrls, {
      concurrency,
      onProgress: (completed, total, batchResult) => {
        const image = urlToImage.get(batchResult.imageUrl);
        if (!image) {
          return;
        }

        if (batchResult.success && batchResult.classification) {
          const isOther = batchResult.classification.category === "other";
          image.category =
            isOther ? null : batchResult.classification.category;
          image.confidence = batchResult.classification.confidence;
          image.primaryScore = isOther
            ? null
            : batchResult.classification.primaryScore ?? null;
          image.status = "analyzed";
          if (batchResult.classification.perspective) {
            image.metadata = {
              ...(image.metadata ?? { width: 0, height: 0, format: "", size: 0, lastModified: 0 }),
              perspective: batchResult.classification.perspective
            };
          }
        } else {
          image.status = "error";
          image.error = batchResult.error || "Analysis failed";
        }

        onProgress?.(completed, total, { ...image });
      }
    });

    return uploadedImages;
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

    const result = await storageService.getSignedDownloadUrl(
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

  private categorizeImages(images: SerializableImageData[]): CategorizedImages {
    const categorized: CategorizedImages = {};

    images.forEach((image) => {
      if (image.category) {
        const category = image.category;
        if (!categorized[category]) {
          categorized[category] = [];
        }
        categorized[category].push(image);
      } else if (image.status === "error") {
        if (!categorized.errors) {
          categorized.errors = [];
        }
        categorized.errors.push(image);
      } else {
        if (!categorized.other) {
          categorized.other = [];
        }
        categorized.other.push(image);
      }
    });

    return categorized;
  }

  private calculateStats(images: SerializableImageData[], duration: number) {
    const uploaded = images.filter((img) => img.url).length;
    const analyzed = images.filter((img) => img.category).length;
    const failed = images.filter((img) => img.status === "error").length;

    const confidences = images
      .filter((img) => img.category)
      .map((img) => img.confidence || 0);

    const avgConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
        : 0;

    const successRate =
      images.length > 0 ? (analyzed / images.length) * 100 : 0;

    return {
      total: images.length,
      uploaded,
      analyzed,
      failed,
      successRate,
      avgConfidence,
      totalDuration: duration
    };
  }

}

const imageProcessorServiceInstance = new imageProcessorService();
export default imageProcessorServiceInstance;
