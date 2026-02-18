/**
 * AI Vision Service for Room Classification
 * Uses OpenAI's Vision API to classify rooms.
 */

import OpenAI from "openai";
import {
  ROOM_CATEGORIES,
  type BatchClassificationResult,
  type BatchProgressCallback,
  type RoomCategory,
  type RoomClassification
} from "@web/src/types/vision";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";

const visionLogger = createChildLogger(baseLogger, {
  module: "vision-service"
});

const CATEGORY_PROMPT_LINES = Object.values(ROOM_CATEGORIES)
  .sort((a, b) => a.order - b.order)
  .map((category) => `- ${category.id}: ${category.label}`)
  .join("\n");

const CLASSIFICATION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    category: {
      type: "string",
      enum: Object.keys(ROOM_CATEGORIES)
    },
    confidence: { type: "number", minimum: 0, maximum: 1 },
    primary_score: { type: "number", minimum: 0, maximum: 1 },
    perspective: {
      type: "string",
      enum: ["aerial", "ground", "none"]
    }
  },
  required: ["category", "confidence", "primary_score", "perspective"]
} as const;

type RetryOptions = {
  timeout: number;
  maxRetries: number;
  timeoutMessage: string;
  failureContext: string;
};

/**
 * Error types that can occur during AI vision processing
 */
type AIVisionErrorCode =
  | "API_ERROR"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "RATE_LIMIT";

export class AIVisionError extends Error {
  constructor(
    message: string,
    public code: AIVisionErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = "AIVisionError";
  }
}

export class VisionService {
  private client: OpenAI | null = null;
  private readonly logger = visionLogger;

  private static readonly CLASSIFICATION_PROMPT = `You are an expert real estate image classifier. Analyze this property image and classify the room type.

IMPORTANT CLASSIFICATION RULES:
1. Choose the MOST SPECIFIC category that fits the image
2. If the image does NOT fit any category, is uncertain/undetermined, or you cannot analyze it, use "other"
3. Consider the primary purpose of the space shown
4. Look for distinctive features (appliances, furniture, fixtures)
5. Never guess a room type from low-quality, irrelevant, or non-room images—use "other" instead
6. If your response would include an apology, refusal, or "cannot analyze", the category MUST be "other"
7. Provide a "primary_score" from 0 to 1 estimating how strong a PRIMARY/hero image this would be for its room category.

PRIMARY_SCORE RUBRIC (0-1):
- Lighting: well-lit, natural light preferred, minimal shadows/overexposure
- Perspective: wide, level, shows layout and depth
- Coverage: clearly represents the room's key features
- Clarity: sharp, not blurry, minimal obstructions/clutter
- Composition: centered/balanced framing suitable as a thumbnail

PERSPECTIVE CLASSIFICATION:
For exterior images ONLY (exterior-front, exterior-backyard), classify the camera perspective:
- "aerial": taken from above (elevated vantage point, bird's-eye view, looking down at the property)
- "ground": taken from ground level (street view, eye-level, standing perspective)
For all interior and non-exterior categories, always use "none".

AVAILABLE CATEGORIES:
${CATEGORY_PROMPT_LINES}

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object, no additional text. Use this exact structure:
{
  "category": "<one of the categories above>",
  "confidence": <number between 0 and 1>,
  "primary_score": <number between 0 and 1>,
  "perspective": "<aerial|ground|none>"
}

EXAMPLES:
{
  "category": "kitchen",
  "confidence": 0.95,
  "primary_score": 0.88,
  "perspective": "none"
}

{
  "category": "exterior-front",
  "confidence": 0.92,
  "primary_score": 0.85,
  "perspective": "aerial"
}

Now analyze the provided image and respond with the classification JSON:`;

  private static readonly VALID_CATEGORIES = Object.keys(
    ROOM_CATEGORIES
  ) as RoomCategory[];

  private getClient(): OpenAI {
    if (this.client) {
      this.logger.debug("Reusing cached OpenAI client");
      return this.client;
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new AIVisionError(
        "OpenAI API key not found. Please set OPENAI_API_KEY environment variable.",
        "API_ERROR"
      );
    }

    this.logger.info("Creating new OpenAI client instance");
    this.client = new OpenAI({ apiKey });
    return this.client;
  }

  private static createTimeout(
    timeout: number,
    message: string
  ): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new AIVisionError(message, "TIMEOUT"));
      }, timeout);
    });
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    { timeout, maxRetries, timeoutMessage, failureContext }: RetryOptions
  ): Promise<T> {
    let lastError: unknown = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      this.logger.debug(
        {
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
          context: failureContext
        },
        "Executing OpenAI operation attempt"
      );

      try {
        const response = await Promise.race([
          operation(),
          VisionService.createTimeout(timeout, timeoutMessage)
        ]);

        this.logger.debug(
          {
            attempt: attempt + 1,
            context: failureContext
          },
          "OpenAI operation succeeded"
        );
        return response;
      } catch (error) {
        lastError = error;
        const message =
          error instanceof Error ? error.message.toLowerCase() : "";

        if (message.includes("rate_limit")) {
          this.logger.warn(
            { context: failureContext },
            "OpenAI rate limit encountered"
          );
          throw new AIVisionError(
            "OpenAI API rate limit exceeded. Please try again later.",
            "RATE_LIMIT",
            error
          );
        }

        this.logger.warn(
          {
            attempt: attempt + 1,
            context: failureContext,
            error:
              error instanceof Error
                ? { name: error.name, message: error.message }
                : error
          },
          "OpenAI operation failed"
        );

        if (attempt === maxRetries) {
          break;
        }

        const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
        this.logger.debug(
          {
            waitTime,
            nextAttempt: attempt + 2,
            context: failureContext
          },
          "Scheduling retry with exponential backoff"
        );
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }

    const failureMessage =
      lastError instanceof Error ? lastError.message : "Unknown error";

    this.logger.error(
      {
        context: failureContext,
        attempts: maxRetries + 1,
        error:
          lastError instanceof Error
            ? { name: lastError.name, message: lastError.message }
            : lastError
      },
      "OpenAI operation exhausted retries"
    );

    throw new AIVisionError(
      `Failed to ${failureContext} after ${maxRetries + 1} attempts: ${
        failureMessage ?? "Unknown error"
      }`,
      "API_ERROR",
      lastError
    );
  }

  public async classifyRoom(
    imageUrl: string,
    options: { timeout?: number; maxRetries?: number } = {}
  ): Promise<RoomClassification> {
    const { timeout = 30000, maxRetries = 2 } = options;
    this.logger.info(
      { imageUrl, timeout, maxRetries },
      "Classifying room image"
    );

    const response = await this.executeWithRetry(
      () =>
        this.getClient().chat.completions.create({
          model: "gpt-4o-2024-08-06",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: VisionService.CLASSIFICATION_PROMPT },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                    detail: "high"
                  }
                }
              ]
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "room_classification",
              description:
                "Room classification with confidence and primary image score.",
              strict: true,
              schema: CLASSIFICATION_SCHEMA
            }
          },
          max_tokens: 500,
          temperature: 0.3
        }),
      {
        timeout,
        maxRetries,
        timeoutMessage: `AI vision request timed out after ${timeout}ms`,
        failureContext: "classify room"
      }
    );

    const content = response.choices[0]?.message?.content;

    if (!content) {
      this.logger.error(
        { imageUrl },
        "Vision API returned empty content during classification"
      );
      throw new AIVisionError(
        "No content in API response",
        "INVALID_RESPONSE",
        response
      );
    }

    const classification = VisionService.parseClassificationResponse(content);
    VisionService.validateClassification(classification);
    this.logger.info(
      {
        imageUrl,
        category: classification.category,
        confidence: classification.confidence
      },
      "Room classification completed"
    );

    return classification;
  }

  public async classifyRoomBatch(
    imageUrls: string[],
    options: {
      concurrency?: number;
      timeout?: number;
      maxRetries?: number;
      onProgress?: BatchProgressCallback;
    } = {}
  ): Promise<BatchClassificationResult[]> {
    const {
      concurrency = 10,
      timeout = 30000,
      maxRetries = 2,
      onProgress
    } = options;

    if (!Array.isArray(imageUrls) || imageUrls.length === 0) {
      this.logger.error(
        { imageUrlsLength: imageUrls?.length },
        "Batch classification received invalid input"
      );
      throw new AIVisionError(
        "imageUrls must be a non-empty array",
        "API_ERROR"
      );
    }

    this.logger.info(
      {
        totalImages: imageUrls.length,
        concurrency,
        timeout,
        maxRetries
      },
      "Starting batch room classification"
    );

    const processor = async (
      imageUrl: string
    ): Promise<BatchClassificationResult> => {
      const startTime = Date.now();

      try {
        const classification = await this.classifyRoom(imageUrl, {
          timeout,
          maxRetries
        });

        this.logger.debug(
          { imageUrl, category: classification.category },
          "Batch classification succeeded"
        );
        return {
          imageUrl,
          success: true,
          classification,
          error: null,
          duration: Date.now() - startTime
        };
      } catch (error) {
        this.logger.error(
          {
            imageUrl,
            error:
              error instanceof Error
                ? { name: error.name, message: error.message }
                : error
          },
          "Batch classification failed"
        );
        return {
          imageUrl,
          success: false,
          classification: null,
          error: error instanceof Error ? error.message : "Unknown error",
          duration: Date.now() - startTime
        };
      }
    };

    const results = await this.processBatch(imageUrls, processor, {
      concurrency,
      onProgress
    });

    this.logger.info(
      {
        total: results.length,
        successful: results.filter((r) => r.success).length
      },
      "Batch room classification finished"
    );

    return results;
  }

  public getBatchStatistics(results: BatchClassificationResult[]) {
    const successful = results.filter((r) => r.success).length;
    const failed = results.length - successful;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const avgDuration = results.length ? totalDuration / results.length : 0;

    const categoryCount: Record<string, number> = {};
    results.forEach((result) => {
      if (result.success && result.classification) {
        const category = result.classification.category;
        categoryCount[category] = (categoryCount[category] || 0) + 1;
      }
    });

    const confidences = results
      .filter((r) => r.success && r.classification)
      .map((r) => r.classification!.confidence);
    const avgConfidence = confidences.length
      ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
      : 0;

    const stats = {
      total: results.length,
      successful,
      failed,
      successRate: results.length ? (successful / results.length) * 100 : 0,
      totalDuration,
      avgDuration,
      avgConfidence,
      categoryCount
    };

    this.logger.debug({ stats }, "Computed batch classification statistics");

    return stats;
  }

  public isConfigured(): boolean {
    return Boolean(process.env.OPENAI_API_KEY);
  }

  public getStatus(): { configured: boolean; message: string } {
    const configured = this.isConfigured();
    return {
      configured,
      message: configured
        ? "AI Vision service is ready"
        : "OpenAI API key not configured. Set OPENAI_API_KEY environment variable."
    };
  }

  private static parseClassificationResponse(
    content: string
  ): RoomClassification {
    try {
      let jsonContent = content.trim();
      const codeBlockMatch = jsonContent.match(
        /```(?:json)?\s*(\{[\s\S]*\})\s*```/
      );

      if (codeBlockMatch) {
        jsonContent = codeBlockMatch[1];
      }

      const parsed = JSON.parse(jsonContent);

      const primaryScore =
        typeof parsed.primary_score === "number"
          ? parsed.primary_score
          : typeof parsed.primaryScore === "number"
            ? parsed.primaryScore
            : undefined;

      const perspective =
        parsed.perspective === "aerial" || parsed.perspective === "ground"
          ? parsed.perspective
          : undefined;

      return {
        category: parsed.category as RoomCategory,
        confidence: parseFloat(parsed.confidence),
        primaryScore,
        perspective
      };
    } catch (error) {
      throw new AIVisionError(
        "Failed to parse AI response as JSON",
        "INVALID_RESPONSE",
        { content, error }
      );
    }
  }

  private static validateClassification(
    classification: RoomClassification
  ): void {
    if (!VisionService.VALID_CATEGORIES.includes(classification.category)) {
      throw new AIVisionError(
        `Invalid room category: ${classification.category}`,
        "INVALID_RESPONSE",
        classification
      );
    }

    if (
      typeof classification.confidence !== "number" ||
      classification.confidence < 0 ||
      classification.confidence > 1
    ) {
      throw new AIVisionError(
        `Invalid confidence value: ${classification.confidence}`,
        "INVALID_RESPONSE",
        classification
      );
    }

    if (
      classification.primaryScore !== undefined &&
      (typeof classification.primaryScore !== "number" ||
        classification.primaryScore < 0 ||
        classification.primaryScore > 1)
    ) {
      throw new AIVisionError(
        `Invalid primary_score value: ${classification.primaryScore}`,
        "INVALID_RESPONSE",
        classification
      );
    }
  }

  private async processBatch<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    options: {
      concurrency: number;
      onProgress?: (completed: number, total: number, result: R) => void;
    }
  ): Promise<R[]> {
    const { concurrency, onProgress } = options;
    const results: R[] = [];
    let completed = 0;

    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency);
      this.logger.debug(
        {
          chunkStart: i,
          chunkEnd: i + chunk.length,
          totalItems: items.length
        },
        "Processing batch chunk"
      );

      const chunkResults = await Promise.all(
        chunk.map(async (item) => {
          const result = await processor(item);
          completed += 1;
          if (onProgress) {
            onProgress(completed, items.length, result);
            this.logger.debug(
              { completed, total: items.length },
              "Emitted batch progress update"
            );
          }
          return result;
        })
      );

      results.push(...chunkResults);
    }

    return results;
  }
}

const visionService = new VisionService();

export default visionService;
