import OpenAI from "openai";
import {
  type BatchClassificationResult,
  type BatchProgressCallback,
  type RoomClassification
} from "@web/src/lib/domain/listing/vision";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  CLASSIFICATION_PROMPT,
  CLASSIFICATION_PROMPT_VERSION
} from "./prompt";
import { CLASSIFICATION_SCHEMA } from "./schema";
import { parseClassificationResponse, validateClassification } from "./parsing";
import { AIVisionError } from "./errors";
import { executeWithRetry } from "./retry";

type LoggerLike = {
  info: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
  error: (obj: unknown, msg?: string) => void;
  debug: (obj: unknown, msg?: string) => void;
};

export type VisionServiceDeps = {
  logger?: LoggerLike;
  clientFactory?: () => OpenAI;
  sleep?: (ms: number) => Promise<void>;
};

export class VisionService {
  private client: OpenAI | null = null;
  private readonly logger: LoggerLike;
  private readonly clientFactory: () => OpenAI;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(deps: VisionServiceDeps = {}) {
    this.logger =
      deps.logger ??
      createChildLogger(baseLogger, {
        module: "vision-service"
      });
    this.clientFactory =
      deps.clientFactory ??
      (() => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          throw new AIVisionError(
            "OpenAI API key not found. Please set OPENAI_API_KEY environment variable.",
            "API_ERROR"
          );
        }
        return new OpenAI({ apiKey });
      });
    this.sleep = deps.sleep ?? ((ms: number) => new Promise((resolve) => setTimeout(resolve, ms)));
  }

  private getClient(): OpenAI {
    if (this.client) {
      this.logger.debug({}, "Reusing cached OpenAI client");
      return this.client;
    }

    this.logger.info({}, "Creating new OpenAI client instance");
    this.client = this.clientFactory();
    return this.client;
  }

  public async classifyRoom(
    imageUrl: string,
    options: { timeout?: number; maxRetries?: number } = {}
  ): Promise<RoomClassification> {
    const { timeout = 30000, maxRetries = 2 } = options;
    this.logger.debug(
      { promptVersion: CLASSIFICATION_PROMPT_VERSION },
      "Classifying room with prompt version"
    );

    const response = await executeWithRetry({
      operation: () =>
        this.getClient().chat.completions.create({
          model: "gpt-4o-2024-08-06",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: CLASSIFICATION_PROMPT },
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
              description: "Room classification with confidence and primary image score.",
              strict: true,
              schema: CLASSIFICATION_SCHEMA
            }
          },
          max_tokens: 500,
          temperature: 0.3
        }),
      options: {
        timeout,
        maxRetries,
        timeoutMessage: `AI vision request timed out after ${timeout}ms`,
        failureContext: "classify room"
      },
      logger: this.logger,
      sleep: this.sleep
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new AIVisionError("No content in API response", "INVALID_RESPONSE", response);
    }

    const classification = parseClassificationResponse(content);
    validateClassification(classification);
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
      throw new AIVisionError("imageUrls must be a non-empty array", "API_ERROR");
    }

    const processor = async (imageUrl: string): Promise<BatchClassificationResult> => {
      const startTime = Date.now();

      try {
        const classification = await this.classifyRoom(imageUrl, {
          timeout,
          maxRetries
        });

        return {
          imageUrl,
          success: true,
          classification,
          error: null,
          duration: Date.now() - startTime
        };
      } catch (error) {
        return {
          imageUrl,
          success: false,
          classification: null,
          error: error instanceof Error ? error.message : "Unknown error",
          duration: Date.now() - startTime
        };
      }
    };

    return this.processBatch(imageUrls, processor, {
      concurrency,
      onProgress
    });
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

      const chunkResults = await Promise.all(
        chunk.map(async (item) => {
          const result = await processor(item);
          completed += 1;
          onProgress?.(completed, items.length, result);
          return result;
        })
      );

      results.push(...chunkResults);
    }

    return results;
  }
}
