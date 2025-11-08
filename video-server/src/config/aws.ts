import { S3Client } from '@aws-sdk/client-s3';
import { env } from './env';

/**
 * Create and configure AWS S3 client
 * Uses IAM role credentials in production (ECS task role)
 * Can use environment variables for local development
 */
export const s3Client = new S3Client({
  region: env.awsRegion,
  // In production (ECS), credentials are automatically loaded from IAM role
  // In development, can use AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY env vars
  // or AWS CLI credentials
});

export const AWS_CONFIG = {
  region: env.awsRegion,
  s3Bucket: env.awsS3Bucket,
} as const;

console.log('[AWS] S3 client initialized for region:', env.awsRegion);
console.log('[AWS] Default S3 bucket:', env.awsS3Bucket);
