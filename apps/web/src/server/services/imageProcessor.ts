/**
 * Image Processor Service
 *
 * Coordinates the AI analysis workflow for property images:
 * - Analyze via AI vision
 * - Enrich with scene descriptions
 * - Categorize results
 * - Generate statistics
 */

import visionService from "./visionService";
import type {
  ProcessedImage,
  ProcessingPhase,
  ProcessingProgress
} from "../../types/images";
import { createChildLogger, logger as baseLogger } from "../../lib/logger";

type ProgressCallback = (progress: ProcessingProgress) => void;

export interface CategorizedImages {
  [category: string]: ProcessedImage[];
}

export interface ProcessingResult {
  images: ProcessedImage[];
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
   * Analyze images workflow: Classification → Scene Descriptions → Categorization
   * Expects images to already be uploaded with uploadUrl set
   */
  public async analyzeImagesWorkflow(
    imageDataList: ProcessedImage[],
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

      const categorized = this.categorizeImages(analyzedImages);
      const stats = this.calculateStats(analyzedImages, Date.now() - startTime);

      onProgress?.({
        phase: "complete",
        completed: analyzedImages.length,
        total: analyzedImages.length,
        overallProgress: 100
      });

      return {
        images: analyzedImages,
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
    images: ProcessedImage[],
    concurrency: number,
    onProgress?: (
      completed: number,
      total: number,
      result: ProcessedImage
    ) => void
  ): Promise<ProcessedImage[]> {
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

    const imageUrls = uploadedImages.map((img) => img.url!);

    await visionService.classifyRoomBatch(imageUrls, {
      concurrency,
      onProgress: (completed, total, batchResult) => {
        const image = uploadedImages.find(
          (img) => img.url === batchResult.imageUrl
        );
        if (!image) {
          return;
        }

        if (batchResult.success && batchResult.classification) {
          image.category = batchResult.classification.category;
          image.confidence = batchResult.classification.confidence;
          image.status = "analyzed";
        } else {
          image.status = "error";
          image.error = batchResult.error || "Analysis failed";
        }

        onProgress?.(completed, total, { ...image });
      }
    });

    await this.generateSceneDescriptions(uploadedImages);
    return uploadedImages;
  }

  private categorizeImages(images: ProcessedImage[]): CategorizedImages {
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

  private calculateStats(images: ProcessedImage[], duration: number) {
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

  private async generateSceneDescriptions(images: ProcessedImage[]) {
    const classifiedImages = images.filter((img) => img.category);
    this.logger.info(
      { total: classifiedImages.length },
      "Generating scene descriptions for analyzed images"
    );

    for (const image of classifiedImages) {
      try {
        const roomType = image.category!.replace(/-/g, " ");
        this.logger.debug(
          { imageId: image.id, roomType },
          "Requesting scene description"
        );

        const sceneDesc = await visionService.generateSceneDescription(
          image.url!,
          roomType,
          { timeout: 30000, maxRetries: 2 }
        );

        if (!sceneDesc?.description) {
          this.logger.warn(
            { imageId: image.id },
            "Scene description missing description text"
          );
          continue;
        }

        image.sceneDescription = sceneDesc.description;

        this.logger.info(
          {
            imageId: image.id,
            descriptionLength: sceneDesc.description.length
          },
          "Scene description generated"
        );
      } catch (error) {
        this.logger.error(
          {
            imageId: image.id,
            error:
              error instanceof Error
                ? { name: error.name, message: error.message }
                : error
          },
          "Failed to generate scene description"
        );
      }
    }

    this.logger.debug(
      {
        summary: images.map((img) => ({
          id: img.id,
          hasSceneDesc: Boolean(img.sceneDescription),
          descLength: img.sceneDescription?.length || 0
        }))
      },
      "Scene description summary"
    );
  }
}

const imageProcessorServiceInstance = new imageProcessorService();
export default imageProcessorServiceInstance;
