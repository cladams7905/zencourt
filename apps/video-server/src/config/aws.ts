import { S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";
import { logger } from "@/config/logger";

const s3Endpoint =
  process.env.AWS_S3_ENDPOINT ||
  process.env.AWS_ENDPOINT ||
  process.env.AWS_S3_URL ||
  undefined;

const forcePathStyle =
  (
    process.env.AWS_FORCE_PATH_STYLE ||
    process.env.AWS_S3_FORCE_PATH_STYLE ||
    ""
  ).toLowerCase() === "true";

/**
 * Create and configure AWS S3 client
 * Uses IAM role credentials in production (ECS task role)
 * Can use environment variables for local development
 */
export const s3Client = new S3Client({
  region: env.awsRegion,
  endpoint: s3Endpoint,
  forcePathStyle
  // In production (ECS), credentials are automatically loaded from IAM role
  // In development, can use AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars
  // or AWS CLI credentials
});

export const AWS_CONFIG = {
  region: env.awsRegion,
  s3Bucket: env.awsS3Bucket
} as const;

logger.info(`[AWS] S3 client initialized for region: ${env.awsRegion}`);
if (s3Endpoint) {
  logger.info(
    `[AWS] Using custom S3 endpoint: ${s3Endpoint}, forcePathStyle: ${forcePathStyle}`
  );
}
logger.info(`[AWS] Default S3 bucket: ${env.awsS3Bucket}`);
