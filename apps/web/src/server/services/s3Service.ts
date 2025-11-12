/**
 * S3 Image Upload Service
 *
 * Videos are processed and uploaded by video-server
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  S3UploadRequest,
  S3UploadBatchResponse,
  S3UploadResponse
} from "@shared/types/api";
import {
  getProjectImagePath,
  getGenericUploadPath,
  extractS3KeyFromUrl
} from "@shared/utils";
import { createChildLogger, logger as baseLogger } from "../../lib/logger";

const logger = createChildLogger(baseLogger, { module: "s3-service" });

// Validate required environment variables
const requiredEnvVars = {
  AWS_REGION: process.env.AWS_REGION,
  AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`${key} environment variable is required`);
  }
}

const s3Client = new S3Client({
  region: requiredEnvVars.AWS_REGION!,
  credentials: {
    accessKeyId: requiredEnvVars.AWS_ACCESS_KEY_ID!,
    secretAccessKey: requiredEnvVars.AWS_SECRET_ACCESS_KEY!
  }
});

const AWS_CONFIG = {
  region: requiredEnvVars.AWS_REGION!,
  bucket: requiredEnvVars.AWS_S3_BUCKET!
} as const;

type UploadContext = {
  key: string;
  buffer: Buffer;
  contentType: string;
  metadata: Record<string, string>;
  filename: string;
};

/**
 * s3Service encapsulates all S3 interactions for the Next.js app.
 */
export class s3Service {
  private readonly client: S3Client;

  constructor(client: S3Client = s3Client) {
    this.client = client;
  }

  /**
   * Upload a single file to S3.
   */
  async uploadFile(uploadRequest: S3UploadRequest): Promise<S3UploadResponse> {
    try {
      const { key, url } = await this.uploadInternal(uploadRequest);
      logger.info({ key, fileName: uploadRequest.fileName }, "File uploaded");

      return {
        success: true,
        url,
        key
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      logger.error(
        { err: error, fileName: uploadRequest.fileName },
        "Upload error"
      );

      return {
        success: false,
        url: null,
        key: null,
        error: message
      };
    }
  }

  /**
   * Batch upload multiple files to S3.
   */
  async uploadFilesBatch(
    uploadRequests: S3UploadRequest[]
  ): Promise<S3UploadBatchResponse> {
    if (uploadRequests.length === 0) {
      return { success: true, results: [] };
    }

    logger.info({ count: uploadRequests.length }, "Starting batch upload");

    const results = await Promise.all(
      uploadRequests.map(async (request) => {
        try {
          const { key, url } = await this.uploadInternal(request);
          return {
            success: true,
            filename: request.fileName,
            key,
            url
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Upload failed";
          logger.error(
            { err: error, fileName: request.fileName },
            "Batch upload error"
          );
          return {
            success: false,
            filename: request.fileName,
            key: null,
            url: null,
            error: message
          };
        }
      })
    );

    const successCount = results.filter((result) => result.success).length;
    logger.info(
      { total: uploadRequests.length, successCount },
      "Batch upload completed"
    );

    return {
      success: successCount === uploadRequests.length,
      results
    };
  }

  /**
   * Delete a file from S3.
   */
  async deleteFileFromS3(
    url: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const key = extractS3KeyFromUrl(url);

      await this.client.send(
        new DeleteObjectCommand({
          Bucket: AWS_CONFIG.bucket,
          Key: key
        })
      );

      logger.info({ key }, "Deleted file");
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      logger.error({ err: error, url }, "Delete error");

      return {
        success: false,
        error: message
      };
    }
  }

  /**
   * Generate a pre-signed URL for temporary access.
   */
  async getSignedUrlForS3(
    key: string,
    expiresIn: number = 3600
  ): Promise<
    { success: true; signedUrl: string } | { success: false; error: string }
  > {
    try {
      const command = new PutObjectCommand({
        Bucket: AWS_CONFIG.bucket,
        Key: key
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      logger.info({ key, expiresIn }, "Generated signed URL");

      return { success: true, signedUrl };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate signed URL";
      logger.error({ err: error, key }, "Signed URL error");

      return {
        success: false,
        error: message
      };
    }
  }

  private async uploadInternal(
    uploadRequest: S3UploadRequest
  ): Promise<{ key: string; url: string }> {
    const context = this.buildUploadContext(uploadRequest);

    await this.client.send(
      new PutObjectCommand({
        Bucket: AWS_CONFIG.bucket,
        Key: context.key,
        Body: context.buffer,
        ContentType: context.contentType,
        Metadata: context.metadata
      })
    );

    return {
      key: context.key,
      url: this.getPublicUrl(context.key)
    };
  }

  private buildUploadContext(uploadRequest: S3UploadRequest): UploadContext {
    const {
      folder = "uploads",
      userId,
      projectId
    } = uploadRequest.options || {};
    const key =
      userId && projectId
        ? getProjectImagePath(userId, projectId, uploadRequest.fileName)
        : getGenericUploadPath(folder, uploadRequest.fileName);

    return {
      key,
      buffer: Buffer.from(uploadRequest.fileBuffer),
      contentType: uploadRequest.contentType,
      filename: uploadRequest.fileName,
      metadata: {
        originalName: uploadRequest.fileName,
        uploadedAt: new Date().toISOString(),
        ...(userId && { userId }),
        ...(projectId && { projectId })
      }
    };
  }

  private getPublicUrl(key: string): string {
    return `https://${AWS_CONFIG.bucket}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;
  }
}

const s3StorageService = new s3Service();

export default s3StorageService;
