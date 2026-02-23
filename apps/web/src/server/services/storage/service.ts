/**
 * Storage service for handling Backblaze B2 object uploads.
 *
 * Videos are processed and uploaded by video-server; this service is for static assets.
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectVersionsCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  StorageUploadRequest,
  StorageUploadBatchResponse,
  StorageUploadResponse
} from "@shared/types/api";
import {
  getListingImagePath,
  getGenericUploadPath,
  extractStorageKeyFromUrl,
  buildStorageConfigFromEnv,
  buildStoragePublicUrl,
  isUrlFromStorageEndpoint
} from "@shared/utils";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";

const logger = createChildLogger(baseLogger, {
  module: "storage-service"
});

type LoggerLike = {
  info: (context: unknown, message?: string) => void;
  error: (context: unknown, message?: string) => void;
};

type StorageRuntimeConfig = {
  region: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl?: string | null;
  keyId: string;
  applicationKey: string;
};

export type StorageServiceDeps = {
  client?: S3Client;
  config?: StorageRuntimeConfig;
  env?: NodeJS.ProcessEnv;
  logger?: LoggerLike;
  now?: () => Date;
};

function buildRuntimeStorageConfig(
  env: NodeJS.ProcessEnv
): StorageRuntimeConfig {
  const parsed = buildStorageConfigFromEnv(
    {
      B2_ENDPOINT: env.B2_ENDPOINT,
      B2_REGION: env.B2_REGION,
      B2_BUCKET_NAME: env.B2_BUCKET_NAME,
      B2_KEY_ID: env.B2_KEY_ID,
      B2_APPLICATION_KEY: env.B2_APPLICATION_KEY,
      STORAGE_PUBLIC_BASE_URL: env.STORAGE_PUBLIC_BASE_URL
    },
    {
      defaultRegion: "us-west-002"
    }
  );

  return {
    region: parsed.region,
    bucket: parsed.bucket,
    endpoint: parsed.endpoint,
    publicBaseUrl: parsed.publicBaseUrl,
    keyId: parsed.keyId,
    applicationKey: parsed.applicationKey
  };
}

function createStorageClient(config: StorageRuntimeConfig): S3Client {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.keyId,
      secretAccessKey: config.applicationKey
    },
    forcePathStyle: false
  });
}

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
  private readonly logger: LoggerLike;
  private readonly now: () => Date;
  private readonly env: NodeJS.ProcessEnv;
  private readonly configOverride?: StorageRuntimeConfig;
  private readonly clientOverride?: S3Client;
  private runtimeConfig: StorageRuntimeConfig | null = null;
  private runtimeClient: S3Client | null = null;

  constructor(deps: StorageServiceDeps = {}) {
    this.logger = deps.logger ?? logger;
    this.now = deps.now ?? (() => new Date());
    this.env = deps.env ?? process.env;
    this.configOverride = deps.config;
    this.clientOverride = deps.client;
  }

  private getConfig(): StorageRuntimeConfig {
    if (this.runtimeConfig) {
      return this.runtimeConfig;
    }
    this.runtimeConfig = this.configOverride ?? buildRuntimeStorageConfig(this.env);
    return this.runtimeConfig;
  }

  private getClient(): S3Client {
    if (this.runtimeClient) {
      return this.runtimeClient;
    }
    this.runtimeClient = this.clientOverride ?? createStorageClient(this.getConfig());
    return this.runtimeClient;
  }

  /**
   * Upload a single file to storage.
   */
  async uploadFile(
    uploadRequest: StorageUploadRequest
  ): Promise<StorageUploadResponse> {
    try {
      const { key, url } = await this.uploadInternal(uploadRequest);
      this.logger.info({ key, fileName: uploadRequest.fileName }, "File uploaded");

      return {
        success: true,
        url,
        key
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      this.logger.error(
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

    this.logger.info({ count: uploadRequests.length }, "Starting batch upload");

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
          this.logger.error(
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

    this.logger.info(
      { total: uploadRequests.length, successCount },
      "Batch upload completed"
    );

    return {
      success: successCount === uploadRequests.length,
      results,
      ...(aggregateError && { error: aggregateError })
    };
  }

  async getSignedUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 900
  ): Promise<{ success: true; url: string } | { success: false; error: string }> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.getConfig().bucket,
        Key: key,
        ContentType: contentType
      });

      const signedUrl = await getSignedUrl(this.getClient(), command, {
        expiresIn
      });
      this.logger.info({ key, expiresIn }, "Generated signed upload URL");

      return { success: true, url: signedUrl };
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to generate signed upload URL";
      this.logger.error({ err: error, key }, "Signed upload URL error");

      return {
        success: false,
        error: message
      };
    }
  }

  buildPublicUrlForKey(key: string): string {
    return buildStoragePublicUrl(
      this.getConfig().publicBaseUrl ?? this.getConfig().endpoint,
      this.getConfig().bucket,
      key
    );
  }

  hasPublicBaseUrl(): boolean {
    return Boolean(this.getConfig().publicBaseUrl);
  }

  /**
   * Resolve a storage URL (signed, raw B2, or CDN) to a public CDN URL when
   * STORAGE_PUBLIC_BASE_URL is configured. Returns null if public base URL is
   * not set, the URL is not from our storage, or key extraction fails.
   */
  getPublicUrlForStorageUrl(url: string): string | null {
    const config = this.getConfig();
    if (!config.publicBaseUrl) {
      return null;
    }
    const isFromB2 = isUrlFromStorageEndpoint(url, config.endpoint);
    const isFromCdn =
      config.publicBaseUrl &&
      isUrlFromStorageEndpoint(url, config.publicBaseUrl);
    if (!isFromB2 && !isFromCdn) {
      return null;
    }
    try {
      const key = url.startsWith("http")
        ? this.normalizeKeyFromUrl(url)
        : this.normalizeKey(url);
      return this.buildPublicUrlForKey(key);
    } catch {
      return null;
    }
  }

  /**
   * Delete a file from storage.
   */
  async deleteFile(
    url: string
  ): Promise<{ success: true } | { success: false; error: string }> {
    try {
      const key = this.normalizeKeyFromUrl(url);
      const versionDeletes = await this.listObjectVersionsForDeletion(key);

      if (versionDeletes.length === 0) {
        await this.getClient().send(
          new DeleteObjectCommand({
            Bucket: this.getConfig().bucket,
            Key: key
          })
        );
      } else {
        for (const version of versionDeletes) {
          await this.getClient().send(
            new DeleteObjectCommand({
              Bucket: this.getConfig().bucket,
              Key: version.key,
              VersionId: version.versionId
            })
          );
        }
      }

      this.logger.info({ key }, "Deleted file");
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed";
      this.logger.error({ err: error, url }, "Delete error");

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

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: this.getConfig().bucket,
        Key: context.key,
        Body: context.buffer,
        ContentType: context.contentType,
        Metadata: context.metadata
      })
    );

    return {
      key: context.key,
      url: buildStoragePublicUrl(
        this.getConfig().publicBaseUrl ?? this.getConfig().endpoint,
        this.getConfig().bucket,
        context.key
      )
    };
  }

  private buildUploadContext(
    uploadRequest: StorageUploadRequest
  ): UploadContext {
    const {
      folder = "uploads",
      userId,
      listingId,
      storageKey
    } = uploadRequest.options || {};
    const key = storageKey
      ? storageKey
      : userId && listingId
      ? getListingImagePath(userId, listingId, uploadRequest.fileName)
      : getGenericUploadPath(folder, uploadRequest.fileName);

    return {
      key,
      buffer: Buffer.from(uploadRequest.fileBuffer),
      contentType: uploadRequest.contentType,
      filename: uploadRequest.fileName,
      metadata: {
        originalName: uploadRequest.fileName,
        uploadedAt: this.now().toISOString(),
        ...(userId && { userId }),
        ...(listingId && { listingId })
      }
    };
  }

  private normalizeKeyFromUrl(url: string): string {
    const extracted = extractStorageKeyFromUrl(url);
    return this.normalizeKey(extracted);
  }

  private async listObjectVersionsForDeletion(
    key: string
  ): Promise<Array<{ key: string; versionId: string }>> {
    let keyMarker: string | undefined;
    let versionIdMarker: string | undefined;
    const versionDeletes: Array<{ key: string; versionId: string }> = [];

    do {
      const response = await this.getClient().send(
        new ListObjectVersionsCommand({
          Bucket: this.getConfig().bucket,
          Prefix: key,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker
        })
      );

      (response.Versions ?? [])
        .filter((version) => version.Key === key && version.VersionId)
        .forEach((version) => {
          versionDeletes.push({
            key,
            versionId: version.VersionId!
          });
        });

      (response.DeleteMarkers ?? [])
        .filter((marker) => marker.Key === key && marker.VersionId)
        .forEach((marker) => {
          versionDeletes.push({
            key,
            versionId: marker.VersionId!
          });
        });

      keyMarker = response.NextKeyMarker;
      versionIdMarker = response.NextVersionIdMarker;
    } while (keyMarker);

    return versionDeletes;
  }

  private normalizeKey(key: string): string {
    return key.startsWith(`${this.getConfig().bucket}/`)
      ? key.substring(this.getConfig().bucket.length + 1)
      : key;
  }
}

export function createStorageService(deps: StorageServiceDeps = {}) {
  return new StorageService(deps);
}

const storageService = createStorageService();

export default storageService;
