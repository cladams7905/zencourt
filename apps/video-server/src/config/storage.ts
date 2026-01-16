import { S3Client } from "@aws-sdk/client-s3";
import { buildStorageConfigFromEnv } from "@shared/utils";
import logger from "@/config/logger";

/**
 * Create and configure Backblaze B2 client using the object storage SDK
 *
 * Configuration:
 * - Uses explicit credentials (B2 application key)
 * - Custom endpoint for Backblaze B2
 * - Virtual-hosted-style URLs (not path-style)
 */
const storageConfig = buildStorageConfigFromEnv(process.env);

export const storageClient = new S3Client({
  region: storageConfig.region,
  endpoint: storageConfig.endpoint,
  credentials: {
    accessKeyId: storageConfig.keyId,
    secretAccessKey: storageConfig.applicationKey
  },
  // Backblaze B2 supports virtual-hosted-style URLs
  forcePathStyle: false
});

export const STORAGE_CONFIG = {
  region: storageConfig.region,
  bucket: storageConfig.bucket,
  endpoint: storageConfig.endpoint,
  publicBaseUrl: storageConfig.publicBaseUrl
} as const;

logger.info(
  `[Storage] Backblaze client initialized for region: ${storageConfig.region}
  On endpoint: ${storageConfig.endpoint}
  For the default bucket: ${storageConfig.bucket}`
);
