"use server";

/**
 * Server Actions for S3 Storage
 *
 * Direct S3 uploads from Next.js server actions
 * Used for image uploads - videos are processed by video-server
 */

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  getProjectImagePath,
  getGenericUploadPath,
  extractS3KeyFromUrl
} from "../../lib/storage-paths";

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

/**
 * Upload a single file to S3
 */
export async function uploadFileToS3(
  fileBuffer: ArrayBuffer,
  fileName: string,
  contentType: string,
  options?: {
    folder?: string;
    userId?: string;
    projectId?: string;
  }
): Promise<
  | { success: true; url: string; key: string }
  | { success: false; error: string }
> {
  try {
    const { folder = "uploads", userId, projectId } = options || {};

    // Generate S3 key based on provided metadata
    let key: string;
    if (userId && projectId) {
      key = getProjectImagePath(userId, projectId, fileName);
    } else {
      key = getGenericUploadPath(folder, fileName);
    }

    const buffer = Buffer.from(fileBuffer);

    // Upload to S3
    await s3Client.send(
      new PutObjectCommand({
        Bucket: AWS_CONFIG.bucket,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        Metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
          ...(userId && { userId }),
          ...(projectId && { projectId })
        }
      })
    );

    const url = `https://${AWS_CONFIG.bucket}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;

    console.log(`[Storage Action] ✓ Uploaded ${fileName} to S3`);

    return { success: true, url, key };
  } catch (error) {
    console.error("[Storage Action] Upload error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed"
    };
  }
}

/**
 * Batch upload multiple files to S3
 */
export async function uploadFilesToS3(
  files: Array<{
    buffer: ArrayBuffer;
    name: string;
    type: string;
  }>,
  options?: {
    folder?: string;
    userId?: string;
    projectId?: string;
  }
): Promise<{
  success: boolean;
  results: Array<{
    success: boolean;
    filename: string;
    url?: string;
    key?: string;
    error?: string;
  }>;
}> {
  try {
    const { folder = "uploads", userId, projectId } = options || {};

    console.log(
      `[Storage Action] Starting batch upload of ${files.length} files`
    );

    // Upload all files in parallel
    const uploadResults = await Promise.all(
      files.map(async (file) => {
        try {
          // Generate S3 key
          let key: string;
          if (userId && projectId) {
            key = getProjectImagePath(userId, projectId, file.name);
          } else {
            key = getGenericUploadPath(folder, file.name);
          }

          const buffer = Buffer.from(file.buffer);

          // Upload to S3
          await s3Client.send(
            new PutObjectCommand({
              Bucket: AWS_CONFIG.bucket,
              Key: key,
              Body: buffer,
              ContentType: file.type,
              Metadata: {
                originalName: file.name,
                uploadedAt: new Date().toISOString(),
                ...(userId && { userId }),
                ...(projectId && { projectId })
              }
            })
          );

          const url = `https://${AWS_CONFIG.bucket}.s3.${AWS_CONFIG.region}.amazonaws.com/${key}`;

          return {
            success: true,
            filename: file.name,
            url,
            key
          };
        } catch (error) {
          console.error(
            `[Storage Action] Failed to upload ${file.name}:`,
            error
          );
          return {
            success: false,
            filename: file.name,
            error: error instanceof Error ? error.message : "Upload failed"
          };
        }
      })
    );

    const successCount = uploadResults.filter((r) => r.success).length;
    console.log(
      `[Storage Action] ✓ Batch upload completed: ${successCount}/${files.length} successful`
    );

    return {
      success: true,
      results: uploadResults
    };
  } catch (error) {
    console.error("[Storage Action] Batch upload error:", error);
    return {
      success: false,
      results: files.map((file) => ({
        success: false,
        filename: file.name,
        error: error instanceof Error ? error.message : "Batch upload failed"
      }))
    };
  }
}

/**
 * Delete a file from S3
 */
export async function deleteFileFromS3(
  url: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    // Extract S3 key from URL
    const key = extractS3KeyFromUrl(url);

    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: AWS_CONFIG.bucket,
        Key: key
      })
    );

    console.log(`[Storage Action] ✓ Deleted file: ${key}`);

    return { success: true };
  } catch (error) {
    console.error("[Storage Action] Delete error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Delete failed"
    };
  }
}

/**
 * Generate a pre-signed URL for temporary access
 */
export async function getSignedUrlForS3(
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

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

    return { success: true, signedUrl };
  } catch (error) {
    console.error("[Storage Action] Signed URL generation error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate signed URL"
    };
  }
}
