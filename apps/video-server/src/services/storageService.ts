import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import logger from "@/config/logger";
import { storageClient, STORAGE_CONFIG } from "@/config/storage";
import { buildStoragePublicUrl, extractStorageKeyFromUrl } from "@shared/utils";

/**
 * Storage-specific error types
 */
export enum StorageErrorType {
  UPLOAD_FAILED = "STORAGE_UPLOAD_FAILED",
  DOWNLOAD_FAILED = "STORAGE_DOWNLOAD_FAILED",
  DELETE_FAILED = "STORAGE_DELETE_FAILED",
  ACCESS_DENIED = "STORAGE_ACCESS_DENIED",
  NOT_FOUND = "STORAGE_NOT_FOUND",
  INVALID_BUCKET = "STORAGE_INVALID_BUCKET",
  NETWORK_ERROR = "STORAGE_NETWORK_ERROR",
  UNKNOWN_ERROR = "STORAGE_UNKNOWN_ERROR"
}

/**
 * Custom storage error class
 */
export class StorageServiceError extends Error {
  constructor(
    message: string,
    public code: StorageErrorType,
    public details?: unknown,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = "StorageServiceError";
  }
}

/**
 * Options for uploading a file
 */
export interface StorageUploadOptions {
  bucket?: string;
  key: string;
  body: Buffer | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Options for getting a signed download URL
 */
export interface StorageSignedUrlOptions {
  bucket?: string;
  key: string;
  expiresIn?: number; // seconds (default: 3600 = 1 hour)
}

/**
 * Retry configuration
 */
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

/**
 * Storage Service
 * Handles all Backblaze B2 operations with retry logic and error handling
 */
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

    logger.info(
      {
        bucket: this.defaultBucket,
        retryConfig: this.retryConfig
      },
      "[StorageService] Initialized"
    );
  }

  /**
   * Upload a file
   */
  async uploadFile(options: StorageUploadOptions): Promise<string> {
    const bucket = options.bucket || this.defaultBucket;
    const { key, body, contentType, metadata } = options;

    logger.info(
      { bucket, key, contentType },
      "[StorageService] Uploading file"
    );

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

        const url = this.buildObjectUrl(bucket, key);
        logger.info(
          { bucket, key, url },
          "[StorageService] ✅ File uploaded successfully"
        );

        return url;
      } catch (error) {
        throw this.handleStorageError(error, StorageErrorType.UPLOAD_FAILED, {
          bucket,
          key
        });
      }
    }, "uploadFile");
  }

  /**
   * Delete a file
   */
  async deleteFile(bucket: string, key: string): Promise<void> {
    const bucketName = bucket || this.defaultBucket;

    logger.info({ bucket: bucketName, key }, "[StorageService] Deleting file");

    return this.executeWithRetry(async () => {
      try {
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key
        });

        await this.client.send(command);
        logger.info(
          { bucket: bucketName, key },
          "[StorageService] ✅ File deleted successfully"
        );
      } catch (error) {
        throw this.handleStorageError(error, StorageErrorType.DELETE_FAILED, {
          bucket: bucketName,
          key
        });
      }
    }, "deleteFile");
  }

  /**
   * Get a pre-signed download URL for temporary access to a file
   */
  async getSignedDownloadUrl(options: StorageSignedUrlOptions): Promise<string> {
    const bucket = options.bucket || this.defaultBucket;
    const { key, expiresIn = 3600 } = options;

    logger.info(
      { bucket, key, expiresIn },
      "[StorageService] Generating signed download URL"
    );

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      logger.info(
        { bucket, key, expiresIn },
        "[StorageService] ✅ Signed download URL generated"
      );

      return url;
    } catch (error) {
      throw this.handleStorageError(error, StorageErrorType.UNKNOWN_ERROR, {
        bucket,
        key
      });
    }
  }

  /**
   * Check if a bucket is accessible (for health checks)
   */
  async checkBucketAccess(bucket?: string): Promise<boolean> {
    const bucketName = bucket || this.defaultBucket;

    try {
      const command = new HeadBucketCommand({
        Bucket: bucketName
      });

      await this.client.send(command);
      logger.debug(
        { bucket: bucketName },
        "[StorageService] ✅ Bucket access verified"
      );

      return true;
    } catch (error) {
      logger.error(
        { bucket: bucketName, error },
        "[StorageService] ❌ Bucket access check failed"
      );
      return false;
    }
  }

  /**
   * Execute an operation with exponential backoff retry
   */
  private buildObjectUrl(bucket: string, key: string): string {
    return buildStoragePublicUrl(
      STORAGE_CONFIG.publicBaseUrl ?? STORAGE_CONFIG.endpoint,
      bucket,
      key
    );
  }

  /**
   * Execute an operation with exponential backoff retry
   */
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

        // Don't retry if error is not retryable
        if (error instanceof StorageServiceError && !error.retryable) {
          throw error;
        }

        // Don't retry on last attempt
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

    // All retries exhausted
    logger.error(
      { operationName, attempts: this.retryConfig.maxAttempts },
      "[StorageService] ❌ All retry attempts exhausted"
    );
    throw lastError;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1);
    return Math.min(delay, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Handle storage errors and convert to StorageServiceError
   */
  private handleStorageError(
    error: unknown,
    defaultType: StorageErrorType,
    context?: unknown
  ): Error {
    if (error instanceof StorageServiceError) {
      return error;
    }

    // Type guard for objects with potential error properties
    const err = error as { Code?: string; name?: string; message?: string };
    const errorCode = err.Code || err.name || "";
    const errorMessage = err.message || "Unknown storage error";

    // Classify error types
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

    logger.error(
      { errorCode, errorMessage, type, retryable, context },
      "[StorageService] Storage operation failed"
    );

    return new StorageServiceError(
      errorMessage,
      type,
      { errorCode, ...(context as object) },
      retryable
    );
  }

  /**
   * Extract object key from a Backblaze-compatible URL
   * Handles both formats:
   * - https://bucket.host/key
   * - s3://bucket/key
   *
   * @param url - Storage URL
   * @returns Object key
   */
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
}

// Export singleton instance
export const storageService = new StorageService();
