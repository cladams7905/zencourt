import { S3Client } from "@aws-sdk/client-s3";
import { buildStorageConfigFromEnv } from "@shared/utils";

/**
 * Create and configure Backblaze B2 client using the object storage SDK
 *
 * Configuration:
 * - Uses explicit credentials (B2 application key)
 * - Custom endpoint for Backblaze B2
 * - Virtual-hosted-style URLs (not path-style)
 */
export function createStorageConfig(env: NodeJS.ProcessEnv = process.env) {
  return buildStorageConfigFromEnv(env);
}

export function createStorageClient(config = createStorageConfig()) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    credentials: {
      accessKeyId: config.keyId,
      secretAccessKey: config.applicationKey
    },
    // Backblaze B2 supports virtual-hosted-style URLs
    forcePathStyle: false
  });
}

const storageConfig = createStorageConfig();

export const storageClient = createStorageClient(storageConfig);

export const STORAGE_CONFIG = {
  region: storageConfig.region,
  bucket: storageConfig.bucket,
  endpoint: storageConfig.endpoint,
  publicBaseUrl: storageConfig.publicBaseUrl
} as const;
