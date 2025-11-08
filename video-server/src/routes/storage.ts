import express, { Request, Response, Router } from 'express';
import multer from 'multer';
import { nanoid } from 'nanoid';
import logger from '@/config/logger';
import { s3Service } from '@/services/s3Service';
import { validateApiKey } from '@/middleware/auth';
import { VideoProcessingError, VideoProcessingErrorType } from '@/middleware/errorHandler';

/**
 * Storage routes for handling S3 uploads/deletes
 * Provides endpoints for Vercel to upload/delete files via proxy
 */

const router: Router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Allow images and videos
    const allowedMimes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new VideoProcessingError(
          `Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimes.join(', ')}`,
          VideoProcessingErrorType.INVALID_INPUT
        )
      );
    }
  },
});

/**
 * Helper functions for S3 path generation
 */

/**
 * Generate S3 key for user project image
 * Format: uploads/{userId}/{projectId}/{filename}
 */
function getUserProjectImagePath(userId: string, projectId: string, filename: string): string {
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `uploads/${userId}/${projectId}/${sanitizedFilename}`;
}

/**
 * Generate S3 key for generic uploads
 * Format: {folder}/{timestamp}-{random}/{filename}
 */
function getGenericUploadPath(folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = nanoid(8);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const sanitizedFolder = folder.replace(/[^a-zA-Z0-9/_-]/g, '_');
  return `${sanitizedFolder}/${timestamp}-${random}/${sanitizedFilename}`;
}

/**
 * Extract S3 key from URL
 * Handles both format: https://bucket.s3.region.amazonaws.com/key and s3://bucket/key
 */
function extractS3KeyFromUrl(url: string): string {
  // Handle s3:// URLs
  if (url.startsWith('s3://')) {
    const parts = url.replace('s3://', '').split('/');
    parts.shift(); // Remove bucket name
    return parts.join('/');
  }

  // Handle HTTPS URLs
  try {
    const urlObj = new URL(url);
    // Remove leading slash
    return urlObj.pathname.substring(1);
  } catch {
    throw new VideoProcessingError(
      `Invalid S3 URL format: ${url}`,
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
}

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /storage/upload
 * Upload a file to S3
 *
 * Form data:
 * - file: File to upload (required)
 * - folder: Folder/prefix for the file (default: "uploads")
 * - userId: User ID for organized storage (optional)
 * - projectId: Project ID for organized storage (optional)
 *
 * Returns:
 * - url: Public S3 URL
 * - signedUrl: Pre-signed URL with 1-hour expiration
 * - key: S3 object key
 */
router.post('/upload', validateApiKey, upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      throw new VideoProcessingError(
        'No file provided in upload request',
        VideoProcessingErrorType.INVALID_INPUT
      );
    }

    const folder = (req.body.folder as string) || 'uploads';
    const userId = req.body.userId as string | undefined;
    const projectId = req.body.projectId as string | undefined;

    // Generate S3 key based on provided metadata
    let key: string;
    if (userId && projectId) {
      key = getUserProjectImagePath(userId, projectId, file.originalname);
      logger.info(
        { userId, projectId, filename: file.originalname, key },
        '[Storage] Uploading file with user/project path'
      );
    } else {
      key = getGenericUploadPath(folder, file.originalname);
      logger.info(
        { folder, filename: file.originalname, key },
        '[Storage] Uploading file with generic path'
      );
    }

    // Upload to S3
    const url = await s3Service.uploadFile({
      key,
      body: file.buffer,
      contentType: file.mimetype,
      metadata: {
        originalName: file.originalname,
        uploadedAt: new Date().toISOString(),
        ...(userId && { userId }),
        ...(projectId && { projectId }),
      },
    });

    // Generate signed URL for immediate access
    const signedUrl = await s3Service.getSignedUrl({
      key,
      expiresIn: 3600, // 1 hour
    });

    logger.info(
      {
        key,
        size: file.size,
        contentType: file.mimetype,
      },
      '[Storage] ✅ File uploaded successfully'
    );

    res.status(200).json({
      success: true,
      url,
      signedUrl,
      key,
      size: file.size,
      contentType: file.mimetype,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      '[Storage] ❌ Upload failed'
    );

    if (error instanceof VideoProcessingError) {
      throw error;
    }

    throw new VideoProcessingError(
      'Failed to upload file to storage',
      VideoProcessingErrorType.S3_UPLOAD_FAILED,
      {
        details: error instanceof Error ? error.message : String(error),
        retryable: true
      }
    );
  }
});

/**
 * DELETE /storage/delete
 * Delete a file from S3
 *
 * Body:
 * - url: S3 URL to delete (required)
 *
 * Returns:
 * - success: true
 */
router.delete('/delete', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { url } = req.body as { url?: string };

    if (!url) {
      throw new VideoProcessingError(
        'No URL provided in delete request',
        VideoProcessingErrorType.INVALID_INPUT
      );
    }

    // Extract S3 key from URL
    const key = extractS3KeyFromUrl(url);

    logger.info({ url, key }, '[Storage] Deleting file');

    // Delete from S3
    await s3Service.deleteFile('', key);

    logger.info({ key }, '[Storage] ✅ File deleted successfully');

    res.status(200).json({
      success: true,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      '[Storage] ❌ Delete failed'
    );

    if (error instanceof VideoProcessingError) {
      throw error;
    }

    throw new VideoProcessingError(
      'Failed to delete file from storage',
      VideoProcessingErrorType.S3_DELETE_FAILED,
      {
        details: error instanceof Error ? error.message : String(error),
        retryable: true
      }
    );
  }
});

/**
 * POST /storage/signed-url
 * Get a signed URL for an existing S3 object
 *
 * Body:
 * - key: S3 object key (required)
 * - expiresIn: Expiration time in seconds (optional, default: 3600)
 *
 * Returns:
 * - signedUrl: Pre-signed URL
 * - expiresIn: Expiration time in seconds
 */
router.post('/signed-url', validateApiKey, async (req: Request, res: Response) => {
  try {
    const { key, expiresIn } = req.body as { key?: string; expiresIn?: number };

    if (!key) {
      throw new VideoProcessingError(
        'No key provided in signed-url request',
        VideoProcessingErrorType.INVALID_INPUT
      );
    }

    const expiry = expiresIn || 3600;

    logger.info({ key, expiresIn: expiry }, '[Storage] Generating signed URL');

    const signedUrl = await s3Service.getSignedUrl({
      key,
      expiresIn: expiry,
    });

    logger.info({ key }, '[Storage] ✅ Signed URL generated');

    res.status(200).json({
      success: true,
      signedUrl,
      expiresIn: expiry,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      '[Storage] ❌ Signed URL generation failed'
    );

    if (error instanceof VideoProcessingError) {
      throw error;
    }

    throw new VideoProcessingError(
      'Failed to generate signed URL',
      VideoProcessingErrorType.S3_DOWNLOAD_FAILED,
      {
        details: error instanceof Error ? error.message : String(error),
        retryable: true
      }
    );
  }
});

export default router;
