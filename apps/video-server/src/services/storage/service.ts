import {
  DeleteObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import logger from "@/config/logger";
import { storageClient, STORAGE_CONFIG } from "@/config/storage";
import { buildStoragePublicUrl, extractStorageKeyFromUrl } from "@shared/utils";
import { StorageErrorType, StorageServiceError } from "./errors";
import type { StorageUploadOptions } from "./types";

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000
};

export class StorageService {
  private client: S3Client;
  private defaultBucket: string;
  private retryConfig: RetryConfig;

  constructor(
    client?: S3Client,
    defaultBucket?: string,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.client = client || storageClient;
    this.defaultBucket = defaultBucket || STORAGE_CONFIG.bucket;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  async uploadFile(options: StorageUploadOptions): Promise<string> {
    const bucket = options.bucket || this.defaultBucket;
    const { key, body, contentType, metadata } = options;

    return this.executeWithRetry(async () => {
      try {
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          Metadata: metadata
        });

        await this.client.send(command);
        return this.buildObjectUrl(bucket, key);
      } catch (error) {
        throw this.handleStorageError(error, StorageErrorType.UPLOAD_FAILED, {
          bucket,
          key
        });
      }
    }, "uploadFile");
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    const bucketName = bucket || this.defaultBucket;
    return this.executeWithRetry(async () => {
      try {
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key
        });
        await this.client.send(command);
      } catch (error) {
        throw this.handleStorageError(error, StorageErrorType.DELETE_FAILED, {
          bucket: bucketName,
          key
        });
      }
    }, "deleteFile");
  }

  getPublicUrlForKey(key: string, bucket?: string): string {
    const bucketName = bucket || this.defaultBucket;
    return this.buildObjectUrl(bucketName, key);
  }

  async checkBucketAccess(bucket?: string): Promise<boolean> {
    const bucketName = bucket || this.defaultBucket;
    try {
      const command = new HeadBucketCommand({ Bucket: bucketName });
      await this.client.send(command);
      return true;
    } catch (error) {
      logger.error(
        { bucket: bucketName, error },
        "[StorageService] Bucket access check failed"
      );
      return false;
    }
  }

  extractKeyFromUrl(url: string): string {
    try {
      const key = extractStorageKeyFromUrl(url);
      if (this.defaultBucket && key.startsWith(`${this.defaultBucket}/`)) {
        return key.substring(this.defaultBucket.length + 1);
      }
      return key;
    } catch (error) {
      throw new StorageServiceError(
        `Invalid storage URL format: ${url}`,
        StorageErrorType.INVALID_BUCKET,
        { url, error }
      );
    }
  }

  buildObjectUrl(bucket: string, key: string): string {
    return buildStoragePublicUrl(
      STORAGE_CONFIG.publicBaseUrl ?? STORAGE_CONFIG.endpoint,
      bucket,
      key
    );
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (error instanceof StorageServiceError && !error.retryable) {
          throw error;
        }
        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }
        const delay = this.calculateBackoff(attempt);
        logger.warn(
          {
            attempt,
            maxAttempts: this.retryConfig.maxAttempts,
            delay,
            operationName
          },
          `[StorageService] Retry attempt ${attempt} after ${delay}ms`
        );
        await this.sleep(delay);
      }
    }
    logger.error(
      { operationName, attempts: this.retryConfig.maxAttempts },
      "[StorageService] All retry attempts exhausted"
    );
    throw lastError;
  }

  private calculateBackoff(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private handleStorageError(
    error: unknown,
    defaultType: StorageErrorType,
    context?: unknown
  ): Error {
    if (error instanceof StorageServiceError) {
      return error;
    }

    const err = error as { Code?: string; name?: string; message?: string };
    const errorCode = err.Code || err.name || "";
    const errorMessage = err.message || "Unknown storage error";

    let type = defaultType;
    let retryable = true;

    switch (errorCode) {
      case "NoSuchKey":
      case "NotFound":
        type = StorageErrorType.NOT_FOUND;
        retryable = false;
        break;
      case "AccessDenied":
      case "Forbidden":
        type = StorageErrorType.ACCESS_DENIED;
        retryable = false;
        break;
      case "NoSuchBucket":
      case "InvalidBucketName":
        type = StorageErrorType.INVALID_BUCKET;
        retryable = false;
        break;
      case "NetworkingError":
      case "TimeoutError":
        type = StorageErrorType.NETWORK_ERROR;
        retryable = true;
        break;
    }

    return new StorageServiceError(
      errorMessage,
      type,
      { errorCode, ...(context as object) },
      retryable
    );
  }
}

export const storageService = new StorageService();
