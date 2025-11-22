import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";
import { logger } from "@/config/logger";

/**
 * Create and configure Backblaze B2 client using the object storage SDK
 *
 * Configuration:
 * - Uses explicit credentials (B2 application key)
 * - Custom endpoint for Backblaze B2
 * - Virtual-hosted-style URLs (not path-style)
 */
export const storageClient = new S3Client({
  region: env.storageRegion,
  endpoint: env.storageEndpoint,
  credentials: {
    accessKeyId: env.storageKeyId,
    secretAccessKey: env.storageApplicationKey
  },
  // Backblaze B2 supports virtual-hosted-style URLs
  forcePathStyle: false
});

export const STORAGE_CONFIG = {
  region: env.storageRegion,
  bucket: env.storageBucket,
  endpoint: env.storageEndpoint
} as const;

logger.info(
  `[Storage] Backblaze client initialized for region: ${env.storageRegion}`
);
logger.info(`[Storage] Endpoint: ${env.storageEndpoint}`);
logger.info(`[Storage] Default bucket: ${env.storageBucket}`);
