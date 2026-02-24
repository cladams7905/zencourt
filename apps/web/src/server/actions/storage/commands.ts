"use server";

import { StorageUploadRequest } from "@shared/types/api/requests";
import { StorageUploadBatchResponse } from "@shared/types/api/responses";
import storageService from "@web/src/server/services/storage";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";

const logger = createChildLogger(baseLogger, { module: "storage-actions" });

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

export async function uploadFileFromBuffer(args: {
  fileBuffer: ArrayBuffer;
  fileName: string;
  contentType: string;
  folder: string;
}): Promise<string> {
  const result = await storageService.uploadFile({
    fileBuffer: args.fileBuffer,
    fileName: args.fileName,
    contentType: args.contentType,
    options: { folder: args.folder }
  });
  if (!result.success || !result.url) {
    throw new Error(result.error || "Failed to upload file");
  }
  return result.url;
}

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
