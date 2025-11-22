/**
 * Storage service for handling Backblaze B2 object uploads.
 *
 * Videos are processed and uploaded by video-server; this service is for static assets.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  StorageUploadRequest,
  StorageUploadBatchResponse,
  StorageUploadResponse
} from "@shared/types/api";
import {
  getProjectImagePath,
  getGenericUploadPath,
  extractStorageKeyFromUrl
} from "@shared/utils";
import { createChildLogger, logger as baseLogger } from "../../lib/logger";

const logger = createChildLogger(baseLogger, { module: "storage-service" });

// Validate required environment variables
const requiredEnvVars = {
  B2_ENDPOINT: process.env.B2_ENDPOINT,
  B2_REGION: process.env.B2_REGION || "us-west-002",
  B2_BUCKET_NAME: process.env.B2_BUCKET_NAME,
  B2_KEY_ID: process.env.B2_KEY_ID,
  B2_APPLICATION_KEY: process.env.B2_APPLICATION_KEY
};

for (const [key, value] of Object.entries(requiredEnvVars)) {
  if (!value) {
    throw new Error(`${key} environment variable is required`);
  }
}

const storageClient = new S3Client({
  region: requiredEnvVars.B2_REGION!,
  endpoint: requiredEnvVars.B2_ENDPOINT!,
  credentials: {
    accessKeyId: requiredEnvVars.B2_KEY_ID!,
    secretAccessKey: requiredEnvVars.B2_APPLICATION_KEY!
  },
  forcePathStyle: false
});

const STORAGE_CONFIG = {
  region: requiredEnvVars.B2_REGION!,
  bucket: requiredEnvVars.B2_BUCKET_NAME!,
  endpoint: requiredEnvVars.B2_ENDPOINT!
} as const;

type UploadContext = {
  key: string;
  buffer: Buffer;
  contentType: string;
  metadata: Record<string, string>;
  filename: string;
};

/**
 * StorageService encapsulates all Backblaze-compatible interactions for the Next.js app.
 */
export class StorageService {
  private readonly client: S3Client;

  constructor(client: S3Client = storageClient) {
    this.client = client;
  }

  /**
   * Upload a single file to storage.
   */
  async uploadFile(
    uploadRequest: StorageUploadRequest
  ): Promise<StorageUploadResponse> {
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
   * Batch upload multiple files.
   */
  async uploadFilesBatch(
    uploadRequests: StorageUploadRequest[]
  ): Promise<StorageUploadBatchResponse> {
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
    const failedResults = results.filter((result) => !result.success);
    const aggregateError =
      failedResults.length > 0
        ? failedResults
            .map(
              (result) =>
                `${result.filename}: ${result.error ?? "Upload failed"}`
            )
            .join("; ")
        : undefined;

    logger.info(
      { total: uploadRequests.length, successCount },
      "Batch upload completed"
    );

    return {
      success: successCount === uploadRequests.length,
      results,
      ...(aggregateError && { error: aggregateError })
    };
  }

  /**
   * Delete a file from storage.
   */
  async deleteFile(
    url: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const key = this.normalizeKeyFromUrl(url);

      await this.client.send(
        new DeleteObjectCommand({
          Bucket: STORAGE_CONFIG.bucket,
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
  async getSignedUploadUrl(
    key: string,
    expiresIn: number = 3600
  ): Promise<
    { success: true; signedUrl: string } | { success: false; error: string }
  > {
    try {
      const command = new PutObjectCommand({
        Bucket: STORAGE_CONFIG.bucket,
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

  /**
   * Generate a signed download URL for an existing object.
   * Accepts either a full storage URL or a raw object key.
   */
  async getSignedDownloadUrl(
    urlOrKey: string,
    expiresIn: number = 900
  ): Promise<
    { success: true; url: string } | { success: false; error: string }
  > {
    try {
      const key = urlOrKey.startsWith("http")
        ? this.normalizeKeyFromUrl(urlOrKey)
        : this.normalizeKey(urlOrKey);

      const command = new GetObjectCommand({
        Bucket: STORAGE_CONFIG.bucket,
        Key: key
      });

      const signedUrl = await getSignedUrl(this.client, command, { expiresIn });
      logger.info({ key, expiresIn }, "Generated signed download URL");

      return { success: true, url: signedUrl };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate signed download URL";
      logger.error({ err: error, urlOrKey }, "Signed download URL error");

      return {
        success: false,
        error: message
      };
    }
  }

  private async uploadInternal(
    uploadRequest: StorageUploadRequest
  ): Promise<{ key: string; url: string }> {
    const context = this.buildUploadContext(uploadRequest);

    await this.client.send(
      new PutObjectCommand({
        Bucket: STORAGE_CONFIG.bucket,
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

  private buildUploadContext(
    uploadRequest: StorageUploadRequest
  ): UploadContext {
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
    const endpoint = STORAGE_CONFIG.endpoint.replace(/\/+$/, "");
    const normalizedKey = key.replace(/^\/+/, "");
    const encodedKey = normalizedKey
      .split("/")
      .map((segment) => encodeURIComponent(segment))
      .join("/");
    return `${endpoint}/${STORAGE_CONFIG.bucket}/${encodedKey}`;
  }

  private normalizeKeyFromUrl(url: string): string {
    const extracted = extractStorageKeyFromUrl(url);
    return this.normalizeKey(extracted);
  }

  private normalizeKey(key: string): string {
    return key.startsWith(`${STORAGE_CONFIG.bucket}/`)
      ? key.substring(STORAGE_CONFIG.bucket.length + 1)
      : key;
  }
}

const storageService = new StorageService();

export default storageService;
