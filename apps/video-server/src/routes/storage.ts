import express, { Request, Response, Router } from "express";
import multer from "multer";
import {
  VideoProcessingError,
  VideoProcessingErrorType
} from "../middleware/errorHandler";
import { validateApiKey } from "../middleware/auth";
import logger from "../config/logger";
import { storageService } from "../services/storageService";
import {
  buildGenericUploadKey,
  buildUserListingVideoKey
} from "@shared/utils/storagePaths";

/**
 * Storage routes for handling Backblaze uploads/deletes
 * Provides endpoints for Vercel to upload/delete files via proxy
 */

const router: Router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  fileFilter: (_req, file, cb) => {
    // Allow images and videos
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
      "video/quicktime"
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new VideoProcessingError(
          `Invalid file type: ${
            file.mimetype
          }. Allowed types: ${allowedMimes.join(", ")}`,
          VideoProcessingErrorType.INVALID_INPUT
        )
      );
    }
  }
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /storage/upload
 * Upload a file to storage
 *
 * Form data:
 * - file: File to upload (required)
 * - folder: Folder/prefix for the file (default: "uploads")
 * - userId: User ID for organized storage (optional)
 * - projectId: Project ID for organized storage (optional)
 * - videoId: Video ID to nest under /videos/video_{videoId} (optional, requires userId & projectId)
 *
 * Returns:
 * - url: Public storage URL
 * - signedUrl: Pre-signed URL with 1-hour expiration
 * - key: Storage object key
 */
router.post(
  "/upload",
  validateApiKey,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        throw new VideoProcessingError(
          "No file provided in upload request",
          VideoProcessingErrorType.INVALID_INPUT
        );
      }

      const folder = (req.body.folder as string) || "uploads";
      const userId = req.body.userId as string | undefined;
      const projectId = req.body.projectId as string | undefined;
      const videoId = req.body.videoId as string | undefined;

      // Generate storage key based on provided metadata
      let key: string;
      if (userId && projectId) {
        key = buildUserListingVideoKey(
          userId,
          projectId,
          file.originalname,
          videoId
        );
        logger.info(
          { userId, projectId, videoId, filename: file.originalname, key },
          "[Storage] Uploading file with user/project path"
        );
      } else {
        key = buildGenericUploadKey(folder, file.originalname);
        logger.info(
          { folder, filename: file.originalname, key },
          "[Storage] Uploading file with generic path"
        );
      }

      // Upload to Backblaze
      const url = await storageService.uploadFile({
        key,
        body: file.buffer,
        contentType: file.mimetype,
        metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          ...(userId && { userId }),
          ...(projectId && { projectId })
        }
      });

      // Generate signed URL for immediate access
      const signedUrl = await storageService.getSignedDownloadUrl({
        key,
        expiresIn: 3600 // 1 hour
      });

      logger.info(
        {
          key,
          size: file.size,
          contentType: file.mimetype
        },
        "[Storage] ✅ File uploaded successfully"
      );

      res.status(200).json({
        success: true,
        url,
        signedUrl,
        key,
        size: file.size,
        contentType: file.mimetype
      });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        "[Storage] ❌ Upload failed"
      );

      if (error instanceof VideoProcessingError) {
        throw error;
      }

      throw new VideoProcessingError(
        "Failed to upload file to storage",
        VideoProcessingErrorType.STORAGE_UPLOAD_FAILED,
        {
          details: error instanceof Error ? error.message : String(error),
          retryable: true
        }
      );
    }
  }
);

/**
 * DELETE /storage/delete
 * Delete a file from storage
 *
 * Body:
 * - url: Storage URL to delete (required)
 *
 * Returns:
 * - success: true
 */
router.delete(
  "/delete",
  validateApiKey,
  async (req: Request, res: Response) => {
    try {
      const { url } = req.body as { url?: string };

      if (!url) {
        throw new VideoProcessingError(
          "No URL provided in delete request",
          VideoProcessingErrorType.INVALID_INPUT
        );
      }

      // Extract storage key from URL
      const key = storageService.extractKeyFromUrl(url);

      logger.info({ url, key }, "[Storage] Deleting file");

      // Delete from storage
      await storageService.deleteFile("", key);

      logger.info({ key }, "[Storage] ✅ File deleted successfully");

      res.status(200).json({
        success: true
      });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        "[Storage] ❌ Delete failed"
      );

      if (error instanceof VideoProcessingError) {
        throw error;
      }

      throw new VideoProcessingError(
        "Failed to delete file from storage",
        VideoProcessingErrorType.STORAGE_DELETE_FAILED,
        {
          details: error instanceof Error ? error.message : String(error),
          retryable: true
        }
      );
    }
  }
);

/**
 * POST /storage/signed-url
 * Get a signed URL for an existing storage object
 *
 * Body:
 * - key: Storage object key (required)
 * - expiresIn: Expiration time in seconds (optional, default: 3600)
 *
 * Returns:
 * - signedUrl: Pre-signed URL
 * - expiresIn: Expiration time in seconds
 */
router.post(
  "/signed-url",
  validateApiKey,
  async (req: Request, res: Response) => {
    try {
      const { key, expiresIn } = req.body as {
        key?: string;
        expiresIn?: number;
      };

      if (!key) {
        throw new VideoProcessingError(
          "No key provided in signed-url request",
          VideoProcessingErrorType.INVALID_INPUT
        );
      }

      const expiry = expiresIn || 3600;

      logger.info(
        { key, expiresIn: expiry },
        "[Storage] Generating signed download URL"
      );

      const signedUrl = await storageService.getSignedDownloadUrl({
        key,
        expiresIn: expiry
      });

      logger.info({ key }, "[Storage] ✅ Signed download URL generated");

      res.status(200).json({
        success: true,
        signedUrl,
        expiresIn: expiry
      });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        "[Storage] ❌ Signed URL generation failed"
      );

      if (error instanceof VideoProcessingError) {
        throw error;
      }

      throw new VideoProcessingError(
        "Failed to generate signed URL",
        VideoProcessingErrorType.STORAGE_DOWNLOAD_FAILED,
        {
          details: error instanceof Error ? error.message : String(error),
          retryable: true
        }
      );
    }
  }
);

/**
 * POST /storage/batch
 * Batch upload multiple files to storage
 *
 * Form data:
 * - files: Array of files to upload (required)
 * - folder: Folder/prefix for the files (default: "uploads")
 * - userId: User ID for organized storage (optional)
 * - projectId: Project ID for organized storage (optional)
 *
 * Returns:
 * - results: Array of upload results for each file
 * - successCount: Number of successful uploads
 * - failureCount: Number of failed uploads
 */
router.post(
  "/batch",
  validateApiKey,
  upload.array("files", 50),
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;

      if (!files || files.length === 0) {
        throw new VideoProcessingError(
          "No files provided in batch upload request",
          VideoProcessingErrorType.INVALID_INPUT
        );
      }

      const folder = (req.body.folder as string) || "uploads";
      const userId = req.body.userId as string | undefined;
      const projectId = req.body.projectId as string | undefined;

      logger.info(
        {
          fileCount: files.length,
          folder,
          userId,
          projectId
        },
        "[Storage Batch] Starting batch upload"
      );

      // Upload all files in parallel
      const uploadResults = await Promise.all(
        files.map(async (file) => {
          try {
            // Generate storage key based on provided metadata
            let key: string;
            if (userId && projectId) {
              key = buildUserListingVideoKey(
                userId,
                projectId,
                file.originalname
              );
            } else {
              key = buildGenericUploadKey(folder, file.originalname);
            }

            // Upload to storage
            const url = await storageService.uploadFile({
              key,
              body: file.buffer,
              contentType: file.mimetype,
              metadata: {
                originalName: file.originalname,
                uploadedAt: new Date().toISOString(),
                ...(userId && { userId }),
                ...(projectId && { projectId })
              }
            });

            logger.info(
              {
                filename: file.originalname,
                key,
                size: file.size
              },
              "[Storage Batch] ✅ File uploaded"
            );

            return {
              success: true,
              filename: file.originalname,
              url,
              key,
              size: file.size,
              contentType: file.mimetype
            };
          } catch (error) {
            logger.error(
              {
                filename: file.originalname,
                error: error instanceof Error ? error.message : String(error)
              },
              "[Storage Batch] ❌ File upload failed"
            );

            return {
              success: false,
              filename: file.originalname,
              error: error instanceof Error ? error.message : "Upload failed"
            };
          }
        })
      );

      const successCount = uploadResults.filter((r) => r.success).length;
      const failureCount = uploadResults.filter((r) => !r.success).length;

      logger.info(
        {
          total: files.length,
          success: successCount,
          failed: failureCount
        },
        "[Storage Batch] ✅ Batch upload completed"
      );

      res.status(200).json({
        success: true,
        results: uploadResults,
        successCount,
        failureCount,
        totalFiles: files.length
      });
    } catch (error) {
      logger.error(
        {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        },
        "[Storage Batch] ❌ Batch upload failed"
      );

      if (error instanceof VideoProcessingError) {
        throw error;
      }

      throw new VideoProcessingError(
        "Failed to batch upload files to storage",
        VideoProcessingErrorType.STORAGE_UPLOAD_FAILED,
        {
          details: error instanceof Error ? error.message : String(error),
          retryable: true
        }
      );
    }
  }
);

export default router;
