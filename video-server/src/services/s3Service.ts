import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import logger from '@/config/logger';
import { s3Client, AWS_CONFIG } from '@/config/aws';

/**
 * S3-specific error types
 */
export enum S3ErrorType {
  UPLOAD_FAILED = 'S3_UPLOAD_FAILED',
  DOWNLOAD_FAILED = 'S3_DOWNLOAD_FAILED',
  DELETE_FAILED = 'S3_DELETE_FAILED',
  ACCESS_DENIED = 'S3_ACCESS_DENIED',
  NOT_FOUND = 'S3_NOT_FOUND',
  INVALID_BUCKET = 'S3_INVALID_BUCKET',
  NETWORK_ERROR = 'S3_NETWORK_ERROR',
  UNKNOWN_ERROR = 'S3_UNKNOWN_ERROR',
}

/**
 * Custom S3 error class
 */
export class S3ServiceError extends Error {
  constructor(
    message: string,
    public code: S3ErrorType,
    public details?: unknown,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'S3ServiceError';
  }
}

/**
 * Options for uploading a file to S3
 */
export interface S3UploadOptions {
  bucket?: string;
  key: string;
  body: Buffer | Readable | string;
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Options for getting a signed URL
 */
export interface S3SignedUrlOptions {
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
  maxDelayMs: 10000,
};

/**
 * S3 Storage Service
 * Handles all S3 operations with retry logic and error handling
 */
export class S3StorageService {
  private client: S3Client;
  private defaultBucket: string;
  private retryConfig: RetryConfig;

  constructor(
    client?: S3Client,
    defaultBucket?: string,
    retryConfig?: Partial<RetryConfig>
  ) {
    this.client = client || s3Client;
    this.defaultBucket = defaultBucket || AWS_CONFIG.s3Bucket;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };

    logger.info(
      {
        bucket: this.defaultBucket,
        retryConfig: this.retryConfig,
      },
      '[S3Service] Initialized'
    );
  }

  /**
   * Upload a file to S3
   */
  async uploadFile(options: S3UploadOptions): Promise<string> {
    const bucket = options.bucket || this.defaultBucket;
    const { key, body, contentType, metadata } = options;

    logger.info({ bucket, key, contentType }, '[S3Service] Uploading file');

    return this.executeWithRetry(async () => {
      try {
        const command = new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          Metadata: metadata,
        });

        await this.client.send(command);

        const url = `https://${bucket}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
        logger.info({ bucket, key, url }, '[S3Service] ✅ File uploaded successfully');

        return url;
      } catch (error) {
        throw this.handleS3Error(error, S3ErrorType.UPLOAD_FAILED, { bucket, key });
      }
    }, 'uploadFile');
  }

  /**
   * Download a file from S3
   */
  async downloadFile(bucket: string, key: string): Promise<Buffer> {
    const bucketName = bucket || this.defaultBucket;

    logger.info({ bucket: bucketName, key }, '[S3Service] Downloading file');

    return this.executeWithRetry(async () => {
      try {
        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        });

        const response = await this.client.send(command);

        if (!response.Body) {
          throw new S3ServiceError(
            'No body in S3 response',
            S3ErrorType.DOWNLOAD_FAILED,
            { bucket: bucketName, key }
          );
        }

        const buffer = await this.streamToBuffer(response.Body as Readable);
        logger.info(
          { bucket: bucketName, key, size: buffer.length },
          '[S3Service] ✅ File downloaded successfully'
        );

        return buffer;
      } catch (error) {
        throw this.handleS3Error(error, S3ErrorType.DOWNLOAD_FAILED, {
          bucket: bucketName,
          key,
        });
      }
    }, 'downloadFile');
  }

  /**
   * Delete a file from S3
   */
  async deleteFile(bucket: string, key: string): Promise<void> {
    const bucketName = bucket || this.defaultBucket;

    logger.info({ bucket: bucketName, key }, '[S3Service] Deleting file');

    return this.executeWithRetry(async () => {
      try {
        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: key,
        });

        await this.client.send(command);
        logger.info({ bucket: bucketName, key }, '[S3Service] ✅ File deleted successfully');
      } catch (error) {
        throw this.handleS3Error(error, S3ErrorType.DELETE_FAILED, {
          bucket: bucketName,
          key,
        });
      }
    }, 'deleteFile');
  }

  /**
   * Get a pre-signed URL for temporary access to a file
   */
  async getSignedUrl(options: S3SignedUrlOptions): Promise<string> {
    const bucket = options.bucket || this.defaultBucket;
    const { key, expiresIn = 3600 } = options;

    logger.info({ bucket, key, expiresIn }, '[S3Service] Generating signed URL');

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.client, command, { expiresIn });
      logger.info({ bucket, key, expiresIn }, '[S3Service] ✅ Signed URL generated');

      return url;
    } catch (error) {
      throw this.handleS3Error(error, S3ErrorType.UNKNOWN_ERROR, { bucket, key });
    }
  }

  /**
   * Copy a file within S3 or between buckets
   */
  async copyFile(
    sourceBucket: string,
    sourceKey: string,
    destBucket: string,
    destKey: string
  ): Promise<void> {
    logger.info(
      {
        source: { bucket: sourceBucket, key: sourceKey },
        destination: { bucket: destBucket, key: destKey },
      },
      '[S3Service] Copying file'
    );

    return this.executeWithRetry(async () => {
      try {
        const command = new CopyObjectCommand({
          Bucket: destBucket,
          CopySource: `${sourceBucket}/${sourceKey}`,
          Key: destKey,
        });

        await this.client.send(command);
        logger.info(
          {
            source: { bucket: sourceBucket, key: sourceKey },
            destination: { bucket: destBucket, key: destKey },
          },
          '[S3Service] ✅ File copied successfully'
        );
      } catch (error) {
        throw this.handleS3Error(error, S3ErrorType.UNKNOWN_ERROR, {
          sourceBucket,
          sourceKey,
          destBucket,
          destKey,
        });
      }
    }, 'copyFile');
  }

  /**
   * List files in a bucket with a prefix
   */
  async listFiles(bucket: string, prefix: string): Promise<string[]> {
    const bucketName = bucket || this.defaultBucket;

    logger.info({ bucket: bucketName, prefix }, '[S3Service] Listing files');

    try {
      const command = new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      });

      const response = await this.client.send(command);
      const keys = response.Contents?.map((obj) => obj.Key || '') || [];

      logger.info(
        { bucket: bucketName, prefix, count: keys.length },
        '[S3Service] ✅ Files listed successfully'
      );

      return keys;
    } catch (error) {
      throw this.handleS3Error(error, S3ErrorType.UNKNOWN_ERROR, { bucket: bucketName, prefix });
    }
  }

  /**
   * Check if a bucket is accessible (for health checks)
   */
  async checkBucketAccess(bucket?: string): Promise<boolean> {
    const bucketName = bucket || this.defaultBucket;

    try {
      const command = new HeadBucketCommand({
        Bucket: bucketName,
      });

      await this.client.send(command);
      logger.debug({ bucket: bucketName }, '[S3Service] ✅ Bucket access verified');

      return true;
    } catch (error) {
      logger.error({ bucket: bucketName, error }, '[S3Service] ❌ Bucket access check failed');
      return false;
    }
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
        if (error instanceof S3ServiceError && !error.retryable) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt === this.retryConfig.maxAttempts) {
          break;
        }

        const delay = this.calculateBackoff(attempt);
        logger.warn(
          { attempt, maxAttempts: this.retryConfig.maxAttempts, delay, operationName },
          `[S3Service] Retry attempt ${attempt} after ${delay}ms`
        );

        await this.sleep(delay);
      }
    }

    // All retries exhausted
    logger.error(
      { operationName, attempts: this.retryConfig.maxAttempts },
      '[S3Service] ❌ All retry attempts exhausted'
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
   * Convert a readable stream to a buffer
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      stream.on('error', reject);
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Handle S3 errors and convert to S3ServiceError
   */
  private handleS3Error(error: unknown, defaultType: S3ErrorType, context?: unknown): Error {
    if (error instanceof S3ServiceError) {
      return error;
    }

    const err = error as any;
    const errorCode = err.Code || err.name || '';
    const errorMessage = err.message || 'Unknown S3 error';

    // Classify error types
    let type = defaultType;
    let retryable = true;

    switch (errorCode) {
      case 'NoSuchKey':
      case 'NotFound':
        type = S3ErrorType.NOT_FOUND;
        retryable = false;
        break;
      case 'AccessDenied':
      case 'Forbidden':
        type = S3ErrorType.ACCESS_DENIED;
        retryable = false;
        break;
      case 'NoSuchBucket':
      case 'InvalidBucketName':
        type = S3ErrorType.INVALID_BUCKET;
        retryable = false;
        break;
      case 'NetworkingError':
      case 'TimeoutError':
        type = S3ErrorType.NETWORK_ERROR;
        retryable = true;
        break;
    }

    logger.error(
      { errorCode, errorMessage, type, retryable, context },
      '[S3Service] S3 operation failed'
    );

    return new S3ServiceError(
      errorMessage,
      type,
      { errorCode, ...(context as object) },
      retryable
    );
  }
}

// Export singleton instance
export const s3Service = new S3StorageService();
