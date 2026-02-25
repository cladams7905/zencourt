"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { StorageUploadRequest } from "@shared/types/api/requests";
import { StorageUploadBatchResponse } from "@shared/types/api/responses";
import storageService from "@web/src/server/services/storage";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";

const logger = createChildLogger(baseLogger, { module: "storage-actions" });

function formatError(error: unknown, fallback: string): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(fallback);
}

async function requireStorageActor() {
  await requireAuthenticatedUser();
}

export const uploadFile = withServerActionCaller(
  "serverAction:uploadFile",
  async (file: File, folder: string): Promise<string> => {
    await requireStorageActor();

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
      if (!result.success || !result.url) {
        logger.error({ error: result.error }, "Error uploading file");
        throw new Error(result.error || "Upload failed");
      }
      return result.url;
    } catch (error) {
      logger.error({ error }, "Error uploading file");
      throw new Error(
        `Failed to upload ${file.name}: ${formatError(error, "Unknown error").message}`
      );
    }
  }
);

export const uploadFileFromBuffer = withServerActionCaller(
  "serverAction:uploadFileFromBuffer",
  async (args: {
    fileBuffer: ArrayBuffer;
    fileName: string;
    contentType: string;
    folder: string;
  }): Promise<string> => {
    await requireStorageActor();
    return uploadFileFromBufferTrusted(args);
  }
);

async function uploadFileFromBufferTrusted(args: {
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

export const uploadCurrentUserBrandingAssetFromBuffer = withServerActionCaller(
  "serverAction:uploadCurrentUserBrandingAssetFromBuffer",
  async (args: {
    fileBuffer: ArrayBuffer;
    fileName: string;
    contentType: string;
  }) => {
    const user = await requireAuthenticatedUser();
    return uploadFileFromBufferTrusted({
      ...args,
      folder: `user_${user.id}/branding`
    });
  }
);

export const uploadFilesBatch = withServerActionCaller(
  "serverAction:uploadFilesBatch",
  async (
    files: File[],
    folder: string,
    userId?: string,
    listingId?: string
  ): Promise<StorageUploadBatchResponse> => {
    await requireStorageActor();

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
        logger.error({ error: result.error }, "Error in batch upload");
        throw new Error(result.error || "Batch upload failed");
      }
      logger.info(`Batch upload successful for ${files.length} files`);
      return result;
    } catch (error) {
      logger.error({ error }, "Error in batch upload");
      throw new Error(formatError(error, "Unknown error").message);
    }
  }
);

export const deleteFile = withServerActionCaller(
  "serverAction:deleteFile",
  async (url: string): Promise<void> => {
    await requireStorageActor();

    try {
      const result = await storageService.deleteFile(url);

      if (!result.success) {
        logger.error({ error: result.error }, "Error deleting file");
        throw new Error(result.error || "Delete failed");
      }
    } catch (error) {
      logger.error({ error }, "Error deleting file");
      throw new Error(
        `Failed to delete file: ${formatError(error, "Unknown error").message}`
      );
    }
  }
);
