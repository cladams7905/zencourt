/**
 * AI Vision Service for Room Classification and Scene Description
 * Uses OpenAI's Vision API to classify rooms and generate scene descriptions.
 */

import OpenAI from "openai";
import {
  type BatchClassificationResult,
  type BatchProgressCallback,
  type RoomCategory,
  type RoomClassification,
  type SceneDescription
} from "@web/src/types/vision";
import { AIVisionError } from "@shared/types/errors";
import { createChildLogger, logger as baseLogger } from "../lib/logger";

const visionLogger = createChildLogger(baseLogger, { module: "vision-service" });

type RetryOptions = {
  timeout: number;
  maxRetries: number;
  timeoutMessage: string;
  failureContext: string;
};

export class VisionService {
  private client: OpenAI | null = null;
  private readonly logger = visionLogger;

  private static readonly CLASSIFICATION_PROMPT = `You are an expert real estate image classifier. Analyze this property image and classify the room type.

IMPORTANT CLASSIFICATION RULES:
1. Choose the MOST SPECIFIC category that fits the image
2. Only use "other" if the image truly doesn't fit any category
3. Consider the primary purpose of the space shown
4. Look for distinctive features (appliances, furniture, fixtures)

AVAILABLE CATEGORIES:
- exterior-front: Front view of house/building exterior, curb appeal shots
- exterior-backyard: Backyard, patio, deck, pool, or rear exterior views
- living-room: Living room, family room, den, or great room
- kitchen: Kitchen or kitchenette with cooking appliances
- dining-room: Formal or casual dining room, breakfast nook
- bedroom: Any bedroom (master, guest, children's room)
- bathroom: Bathroom, powder room, or ensuite
- garage: Garage, carport, or parking area
- office: Home office, study, library, or workspace
- laundry-room: Laundry room, utility room, or mudroom
- basement: Basement, cellar, or below-grade space
- other: Hallways, closets, storage, or unclear spaces

RESPONSE FORMAT:
You must respond with ONLY a valid JSON object, no additional text. Use this exact structure:
{
  "category": "<one of the categories above>",
  "confidence": <number between 0 and 1>,
  "reasoning": "<brief 1-2 sentence explanation>",
  "features": ["<feature1>", "<feature2>", "<feature3>"]
}

EXAMPLES:
{
  "category": "kitchen",
  "confidence": 0.95,
  "reasoning": "Clear view of modern kitchen with stainless steel appliances, granite countertops, and island.",
  "features": ["refrigerator", "stove", "granite countertops", "pendant lights", "kitchen island"]
}

{
  "category": "bedroom",
  "confidence": 0.88,
  "reasoning": "Room with bed as the central feature, nightstands, and closet visible.",
  "features": ["queen bed", "nightstands", "ceiling fan", "carpet flooring"]
}

Now analyze the provided image and respond with the classification JSON:`;

  private static readonly SCENE_DESCRIPTION_PROMPT = `You are an expert at analyzing interior and exterior spaces for video generation. Analyze this image and provide a SHORT, CONCISE description that will be used to generate a video walkthrough.

CRITICAL REQUIREMENTS:
- Write ONLY 1-2 SHORT sentences (maximum 30-40 words total)
- Be specific but extremely concise
- Focus on the most visually distinctive elements
- Mention key features: layout, materials, colors, lighting
- Avoid unnecessary details or marketing language
- Keep it brief and direct

EXAMPLES:

For a kitchen:
"Modern white kitchen with gray quartz countertops and a large center island. Stainless appliances and subway tile backsplash with natural light from a window above the sink."

For a living room:
"Spacious living room with vaulted ceilings, dark hardwood floors, and floor-to-ceiling windows. Modern linear fireplace with gray stone surround and charcoal sectional sofa."

Now analyze the provided image and provide a SHORT, CONCISE scene description (1-2 sentences max):`;

  private static readonly VALID_CATEGORIES: RoomCategory[] = [
    "exterior-front",
    "exterior-backyard",
    "living-room",
    "kitchen",
    "dining-room",
    "bedroom",
    "bathroom",
    "garage",
    "office",
    "laundry-room",
    "basement",
    "other"
  ];

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
              error instanceof Error ? { name: error.name, message: error.message } : error
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
          model: "gpt-4o",
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

  public async generateSceneDescription(
    imageUrl: string,
    roomType: string,
    options: { timeout?: number; maxRetries?: number } = {}
  ): Promise<SceneDescription> {
    const { timeout = 30000, maxRetries = 2 } = options;
    this.logger.info(
      { imageUrl, roomType, timeout, maxRetries },
      "Generating scene description"
    );

    const response = await this.executeWithRetry(
      () =>
        this.getClient().chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: VisionService.SCENE_DESCRIPTION_PROMPT },
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
          max_tokens: 150,
          temperature: 0.7
        }),
      {
        timeout,
        maxRetries,
        timeoutMessage: `Scene description request timed out after ${timeout}ms`,
        failureContext: "generate scene description"
      }
    );

    const content = response.choices[0]?.message?.content;

    if (!content) {
      this.logger.error(
        { imageUrl, roomType },
        "Vision API returned empty content during scene description"
      );
      throw new AIVisionError(
        "No content in API response",
        "INVALID_RESPONSE",
        response
      );
    }

    const trimmed = content.trim();
    this.logger.info(
      { imageUrl, roomType, length: trimmed.length },
      "Scene description generated"
    );

    return {
      description: trimmed,
      roomType,
      keyFeatures: VisionService.extractKeyFeatures(content)
    };
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

      return {
        category: parsed.category as RoomCategory,
        confidence: parseFloat(parsed.confidence),
        reasoning: parsed.reasoning,
        features: parsed.features || []
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
  }

  private static extractKeyFeatures(description: string): string[] {
    const features: string[] = [];
    const patterns = [
      /(\w+\s+)?(?:cabinets?|cabinetry)/gi,
      /(\w+\s+)?countertops?/gi,
      /(\w+\s+)?flooring/gi,
      /(\w+\s+)?windows?/gi,
      /(\w+\s+)?lights?|lighting/gi,
      /(\w+\s+)?ceilings?/gi,
      /(\w+\s+)?fireplace/gi,
      /(\w+\s+)?backsplash/gi,
      /(\w+\s+)?island/gi,
      /(\w+\s+)?appliances?/gi,
      /(\w+\s+)?beams?/gi,
      /(\w+\s+)?shelving|shelves/gi
    ];

    patterns.forEach((pattern) => {
      const matches = description.match(pattern);
      if (matches) {
        matches.forEach((match) => {
          const cleaned = match.trim().toLowerCase();
          if (!features.includes(cleaned)) {
            features.push(cleaned);
          }
        });
      }
    });

    return features.slice(0, 10);
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
