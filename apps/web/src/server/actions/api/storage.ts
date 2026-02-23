"use server";

/**
 * Client-side wrapper for Backblaze storage operations via storageService.
 * Includes support for images and videos.
 */

import { StorageUploadRequest } from "@shared/types/api/requests";
import { StorageUploadBatchResponse } from "@shared/types/api/responses";
import storageService from "../../services/storage";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";

const logger = createChildLogger(baseLogger, { module: "storage-actions" });

/**
 * Upload a single file to storage via server action
 * @param file - File to upload
 * @param folder - Folder path for organization (e.g., "listings/abc123")
 * @returns Public URL of the uploaded file
 */
export async function uploadFile(file: File, folder: string): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await storageService.uploadFile({
      fileBuffer: arrayBuffer,
      fileName: file.name,
      contentType: file.type,
      options: {
        folder
      }
    });
    if (!result.success) {
      logger.error(`Error uploading file: ${result.error}`);
      throw new Error(result.error);
    }
    return result.url!;
  } catch (error) {
    logger.error(`Error uploading file: ${error}`);
    throw new Error(
      `Failed to upload ${file.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Batch upload multiple files to storage in a single server action call
 * More efficient than individual uploads for multiple files
 * @param files - Array of files to upload
 * @param folder - Folder path for organization
 * @param userId - User ID for organized storage (optional)
 * @param listingId - Listing ID for organized storage (optional)
 * @returns Array of upload results with status for each file
 */
export async function uploadFilesBatch(
  files: File[],
  folder: string,
  userId?: string,
  listingId?: string
): Promise<StorageUploadBatchResponse> {
  try {
    const filesWithBuffers: StorageUploadRequest[] = await Promise.all(
      files.map(async (file) => ({
        fileBuffer: await file.arrayBuffer(),
        fileName: file.name,
        contentType: file.type,
        options: {
          folder,
          userId,
          listingId
        }
      }))
    );
    const result = await storageService.uploadFilesBatch(filesWithBuffers);
    if (!result.success) {
      logger.error(`Error in batch upload: ${result.error}`);
      throw new Error(result.error);
    }
    logger.info(`Batch upload successful for ${files.length} files`);
    return result;
  } catch (error) {
    logger.error(`Error in batch upload: ${error}`);
    return {
      success: false,
      results: [],
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

/**
 * Delete a file from storage via server action
 * @param url - URL of the file to delete
 */
export async function deleteFile(url: string): Promise<void> {
  try {
    const result = await storageService.deleteFile(url);

    if (!result.success) {
      logger.error(`Error deleting file: ${result.error}`);
      throw new Error(result.error);
    }
  } catch (error) {
    logger.error(`Error deleting file: ${error}`);
    throw new Error(
      `Failed to delete file: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}
