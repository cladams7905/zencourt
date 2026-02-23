import logger from "@/config/logger";
import {
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";
import {
  buildGenericUploadKey,
  buildUserListingVideoKey
} from "@shared/utils/storagePaths";
import type {
  BatchUploadRouteInput,
  UploadRouteInput
} from "@/routes/storage/domain/requests";

type StoragePort = {
  uploadFile: (args: {
    key: string;
    body: Buffer;
    contentType: string;
    metadata: Record<string, string>;
  }) => Promise<string>;
  getPublicUrlForKey: (key: string, bucket?: string) => string;
  extractKeyFromUrl: (url: string) => string;
  deleteFile: (bucket: string, key: string) => Promise<void>;
};

function buildUploadKey(input: {
  folder: string;
  filename: string;
  userId?: string;
  listingId?: string;
  videoId?: string;
}): string {
  if (input.userId && input.listingId) {
    return buildUserListingVideoKey(
      input.userId,
      input.listingId,
      input.filename,
      input.videoId
    );
  }
  return buildGenericUploadKey(input.folder, input.filename);
}

export async function handleSingleUpload(
  input: UploadRouteInput,
  storage: StoragePort
): Promise<{
  success: true;
  url: string;
  signedUrl: string;
  key: string;
  size: number;
  contentType: string;
}> {
  try {
    const key = buildUploadKey({
      folder: input.folder,
      filename: input.file.originalname,
      userId: input.userId,
      listingId: input.listingId,
      videoId: input.videoId
    });

    const url = await storage.uploadFile({
      key,
      body: input.file.buffer,
      contentType: input.file.mimetype,
      metadata: {
        originalName: input.file.originalname,
        uploadedAt: new Date().toISOString(),
        ...(input.userId && { userId: input.userId }),
        ...(input.listingId && { listingId: input.listingId })
      }
    });

    const readUrl = storage.getPublicUrlForKey(key);

    return {
      success: true,
      url,
      signedUrl: readUrl,
      key,
      size: input.file.size,
      contentType: input.file.mimetype
    };
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      "[Storage] Upload failed"
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

export async function handleDeleteByUrl(
  url: string,
  storage: StoragePort
): Promise<{ success: true }> {
  try {
    const key = storage.extractKeyFromUrl(url);
    await storage.deleteFile("", key);
    return { success: true };
  } catch (error) {
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

export async function handleSignedUrlRequest(
  key: string,
  expiresIn: number,
  storage: StoragePort
): Promise<{ success: true; signedUrl: string; expiresIn: number }> {
  try {
    const signedUrl = storage.getPublicUrlForKey(key);
    return { success: true, signedUrl, expiresIn };
  } catch (error) {
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

export async function handleBatchUpload(
  input: BatchUploadRouteInput,
  storage: StoragePort
): Promise<{
  success: true;
  results: Array<Record<string, unknown>>;
  successCount: number;
  failureCount: number;
  totalFiles: number;
}> {
  try {
    const uploadResults = await Promise.all(
      input.files.map(async (file) => {
        try {
          const key = buildUploadKey({
            folder: input.folder,
            filename: file.originalname,
            userId: input.userId,
            listingId: input.listingId
          });

          const url = await storage.uploadFile({
            key,
            body: file.buffer,
            contentType: file.mimetype,
            metadata: {
              originalName: file.originalname,
              uploadedAt: new Date().toISOString(),
              ...(input.userId && { userId: input.userId }),
              ...(input.listingId && { listingId: input.listingId })
            }
          });

          return {
            success: true,
            filename: file.originalname,
            url,
            key,
            size: file.size,
            contentType: file.mimetype
          };
        } catch (error) {
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

    return {
      success: true,
      results: uploadResults,
      successCount,
      failureCount,
      totalFiles: input.files.length
    };
  } catch (error) {
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
