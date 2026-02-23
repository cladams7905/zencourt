"use server";

import { nanoid } from "nanoid";
import { db, userAdditional, userMedia } from "@db/client";
import type { DBUserMedia } from "@db/types/models";
import {
  getUserMediaFolder,
  getUserMediaPath,
  getUserMediaThumbnailFolder,
  getUserMediaThumbnailPath
} from "@shared/utils/storagePaths";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@shared/utils/mediaUpload";
import storageService from "@web/src/server/services/storage";
import { withDbErrorHandling } from "@web/src/server/actions/shared/dbErrorHandling";
import { requireUserId } from "@web/src/server/actions/shared/validation";
import {
  buildUploadFailure,
  isImageMimeType,
  isVideoMimeType,
  toMegabytes
} from "@web/src/server/actions/shared/uploadValidation";
import { getPublicDownloadUrlSafe } from "@web/src/server/utils/storageUrls";
import type {
  UserMediaSignedUpload,
  UserMediaRecordInput,
  UserMediaUploadRequest,
  UserMediaUploadUrlResult
} from "./types";

type UploadFailure = UserMediaUploadUrlResult["failed"][number];

type UploadContext = {
  userId: string;
  maxImageMb: number;
  maxVideoMb: number;
};

function buildUploadContext(userId: string): UploadContext {
  return {
    userId,
    maxImageMb: toMegabytes(MAX_IMAGE_BYTES),
    maxVideoMb: toMegabytes(MAX_VIDEO_BYTES)
  };
}

function unsupportedFileTypeFailure(file: UserMediaUploadRequest): UploadFailure {
  return buildUploadFailure(
    file.id,
    file.fileName,
    "Only image and video files are supported."
  );
}

async function buildImageUpload(
  file: UserMediaUploadRequest,
  ctx: UploadContext
): Promise<{ upload?: UserMediaSignedUpload; failed?: UploadFailure }> {
  if (file.fileSize > MAX_IMAGE_BYTES) {
    return {
      failed: buildUploadFailure(
        file.id,
        file.fileName,
        `Images must be ${ctx.maxImageMb} MB or smaller.`
      )
    };
  }

  const key = getUserMediaPath(ctx.userId, "image", file.fileName);
  const signed = await storageService.getSignedUploadUrl(key, file.fileType);
  if (!signed.success) {
    return {
      failed: buildUploadFailure(file.id, file.fileName, signed.error)
    };
  }

  return {
    upload: {
      id: file.id,
      fileName: file.fileName,
      type: "image",
      key,
      uploadUrl: signed.url,
      publicUrl: storageService.buildPublicUrlForKey(key)
    }
  };
}

async function buildVideoUpload(
  file: UserMediaUploadRequest,
  ctx: UploadContext
): Promise<{ upload?: UserMediaSignedUpload; failed?: UploadFailure }> {
  if (file.fileSize > MAX_VIDEO_BYTES) {
    return {
      failed: buildUploadFailure(
        file.id,
        file.fileName,
        `Videos must be ${ctx.maxVideoMb} MB or smaller.`
      )
    };
  }

  const key = getUserMediaPath(ctx.userId, "video", file.fileName);
  const signed = await storageService.getSignedUploadUrl(key, file.fileType);
  if (!signed.success) {
    return {
      failed: buildUploadFailure(file.id, file.fileName, signed.error)
    };
  }

  const thumbnailKey = getUserMediaThumbnailPath(ctx.userId, file.fileName);
  const thumbnailSigned = await storageService.getSignedUploadUrl(
    thumbnailKey,
    "image/jpeg"
  );
  if (!thumbnailSigned.success) {
    return {
      failed: buildUploadFailure(file.id, file.fileName, thumbnailSigned.error)
    };
  }

  return {
    upload: {
      id: file.id,
      fileName: file.fileName,
      type: "video",
      key,
      uploadUrl: signed.url,
      publicUrl: storageService.buildPublicUrlForKey(key),
      thumbnailKey,
      thumbnailUploadUrl: thumbnailSigned.url,
      thumbnailPublicUrl: storageService.buildPublicUrlForKey(thumbnailKey)
    }
  };
}

export async function getUserMediaUploadUrls(
  userId: string,
  files: UserMediaUploadRequest[]
): Promise<UserMediaUploadUrlResult> {
  requireUserId(userId, "User ID is required to upload media");

  if (!files || files.length === 0) {
    throw new Error("No files provided for upload");
  }

  return withDbErrorHandling(
    async () => {
      const uploads = [] as UserMediaUploadUrlResult["uploads"];
      const failed = [] as UserMediaUploadUrlResult["failed"];
      const ctx = buildUploadContext(userId);

      for (const file of files) {
        let result: { upload?: UserMediaSignedUpload; failed?: UploadFailure };

        if (isImageMimeType(file.fileType)) {
          result = await buildImageUpload(file, ctx);
        } else if (isVideoMimeType(file.fileType)) {
          result = await buildVideoUpload(file, ctx);
        } else {
          result = { failed: unsupportedFileTypeFailure(file) };
        }

        if (result.upload) {
          uploads.push(result.upload);
        } else if (result.failed) {
          failed.push(result.failed);
        }
      }

      return { uploads, failed };
    },
    {
      actionName: "getUserMediaUploadUrls",
      context: { userId, fileCount: files.length },
      errorMessage: "Failed to prepare uploads. Please try again."
    }
  );
}

export async function createUserMediaRecords(
  userId: string,
  uploads: UserMediaRecordInput[]
): Promise<DBUserMedia[]> {
  requireUserId(userId, "User ID is required to save media");

  if (!uploads || uploads.length === 0) {
    return [];
  }

  return withDbErrorHandling(
    async () => {
      const imagePrefix = getUserMediaFolder(userId, "image");
      const videoPrefix = getUserMediaFolder(userId, "video");
      const thumbnailPrefix = getUserMediaThumbnailFolder(userId);
      const now = new Date();

      const rows = uploads.map((upload) => {
        const prefix =
          upload.type === "video" ? `${videoPrefix}/` : `${imagePrefix}/`;
        if (!upload.key.startsWith(prefix)) {
          throw new Error("Invalid media upload key");
        }

        if (upload.thumbnailKey) {
          if (!upload.thumbnailKey.startsWith(`${thumbnailPrefix}/`)) {
            throw new Error("Invalid media thumbnail upload key");
          }
        }

        return {
          id: nanoid(),
          userId,
          type: upload.type,
          url: storageService.buildPublicUrlForKey(upload.key),
          thumbnailUrl: upload.thumbnailKey
            ? storageService.buildPublicUrlForKey(upload.thumbnailKey)
            : null,
          usageCount: 0,
          uploadedAt: now
        };
      });

      const created = await db.insert(userMedia).values(rows).returning();
      const mediaWithPublicUrls = created.map((media) => ({
        ...media,
        url: getPublicDownloadUrlSafe(media.url) ?? media.url,
        thumbnailUrl:
          getPublicDownloadUrlSafe(media.thumbnailUrl) ?? media.thumbnailUrl
      }));

      await db
        .insert(userAdditional)
        .values({
          userId,
          mediaUploadedAt: now,
          updatedAt: now
        })
        .onConflictDoUpdate({
          target: userAdditional.userId,
          set: {
            mediaUploadedAt: now,
            updatedAt: now
          }
        });

      return mediaWithPublicUrls;
    },
    {
      actionName: "createUserMediaRecords",
      context: { userId, uploadCount: uploads.length },
      errorMessage: "Failed to save media. Please try again."
    }
  );
}
