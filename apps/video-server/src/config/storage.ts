import { S3Client } from "@aws-sdk/client-s3";
import logger from "@/config/logger";

/**
 * Create and configure Backblaze B2 client using the object storage SDK
 *
 * Configuration:
 * - Uses explicit credentials (B2 application key)
 * - Custom endpoint for Backblaze B2
 * - Virtual-hosted-style URLs (not path-style)
 */
export const storageClient = new S3Client({
  region: process.env.B2_REGION,
  endpoint: process.env.B2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.B2_KEY_ID,
    secretAccessKey: process.env.B2_APPLICATION_KEY
  },
  // Backblaze B2 supports virtual-hosted-style URLs
  forcePathStyle: false
});

export const STORAGE_CONFIG = {
  region: process.env.B2_REGION,
  bucket: process.env.B2_BUCKET_NAME,
  endpoint: process.env.B2_ENDPOINT
} as const;

logger.info(
  `[Storage] Backblaze client initialized for region: ${process.env.B2_REGION}
  On endpoint: ${process.env.B2_ENDPOINT}
  For the default bucket: ${process.env.B2_BUCKET_NAME}`
);
