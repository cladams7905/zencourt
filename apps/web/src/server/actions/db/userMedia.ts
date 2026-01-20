"use server";

import { db, userMedia, userAdditional, eq, desc } from "@db/client";
import type { DBUserMedia, UserMediaType } from "@shared/types/models";
import { getUserMediaPath, getUserMediaFolder } from "@shared/utils/storagePaths";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@shared/utils/mediaUpload";
import { withDbErrorHandling } from "../_utils";
import { nanoid } from "nanoid";
import storageService from "../../services/storageService";
import { getSignedDownloadUrlSafe } from "../../utils/storageUrls";

export async function getUserMedia(userId: string): Promise<DBUserMedia[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch media");
  }

  return withDbErrorHandling(
    async () => {
      const media = await db
        .select()
        .from(userMedia)
        .where(eq(userMedia.userId, userId))
        .orderBy(desc(userMedia.uploadedAt));

      return media;
    },
    {
      actionName: "getUserMedia",
      context: { userId },
      errorMessage: "Failed to fetch media. Please try again."
    }
  );
}

type UserMediaUploadRequest = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

type UserMediaSignedUpload = {
  id: string;
  fileName: string;
  type: UserMediaType;
  key: string;
  uploadUrl: string;
  publicUrl: string;
};

type UserMediaUploadUrlResult = {
  uploads: UserMediaSignedUpload[];
  failed: Array<{ id: string; fileName: string; error: string }>;
};

export async function getUserMediaUploadUrls(
  userId: string,
  files: UserMediaUploadRequest[]
): Promise<UserMediaUploadUrlResult> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to upload media");
  }

  if (!files || files.length === 0) {
    throw new Error("No files provided for upload");
  }

  return withDbErrorHandling(
    async () => {
      const uploads: UserMediaSignedUpload[] = [];
      const failed: Array<{ id: string; fileName: string; error: string }> = [];
      const maxImageMb = Math.round(MAX_IMAGE_BYTES / (1024 * 1024));
      const maxVideoMb = Math.round(MAX_VIDEO_BYTES / (1024 * 1024));

      for (const file of files) {
        if (file.fileType.startsWith("image/")) {
          if (file.fileSize > MAX_IMAGE_BYTES) {
            failed.push({
              id: file.id,
              fileName: file.fileName,
              error: `Images must be ${maxImageMb} MB or smaller.`
            });
            continue;
          }

          const key = getUserMediaPath(userId, "image", file.fileName);
          const signed = await storageService.getSignedUploadUrl(
            key,
            file.fileType
          );
          if (!signed.success) {
            failed.push({
              id: file.id,
              fileName: file.fileName,
              error: signed.error
            });
            continue;
          }

          uploads.push({
            id: file.id,
            fileName: file.fileName,
            type: "image",
            key,
            uploadUrl: signed.url,
            publicUrl: storageService.buildPublicUrlForKey(key)
          });
          continue;
        }

        if (file.fileType.startsWith("video/")) {
          if (file.fileSize > MAX_VIDEO_BYTES) {
            failed.push({
              id: file.id,
              fileName: file.fileName,
              error: `Videos must be ${maxVideoMb} MB or smaller.`
            });
            continue;
          }

          const key = getUserMediaPath(userId, "video", file.fileName);
          const signed = await storageService.getSignedUploadUrl(
            key,
            file.fileType
          );
          if (!signed.success) {
            failed.push({
              id: file.id,
              fileName: file.fileName,
              error: signed.error
            });
            continue;
          }

          uploads.push({
            id: file.id,
            fileName: file.fileName,
            type: "video",
            key,
            uploadUrl: signed.url,
            publicUrl: storageService.buildPublicUrlForKey(key)
          });
          continue;
        }

        failed.push({
          id: file.id,
          fileName: file.fileName,
          error: "Only image and video files are supported."
        });
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

type UserMediaRecordInput = {
  key: string;
  type: UserMediaType;
};

export async function createUserMediaRecords(
  userId: string,
  uploads: UserMediaRecordInput[]
): Promise<DBUserMedia[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to save media");
  }

  if (!uploads || uploads.length === 0) {
    return [];
  }

  return withDbErrorHandling(
    async () => {
      const imagePrefix = getUserMediaFolder(userId, "image");
      const videoPrefix = getUserMediaFolder(userId, "video");
      const now = new Date();

      const rows = uploads.map((upload) => {
        const prefix =
          upload.type === "video" ? `${videoPrefix}/` : `${imagePrefix}/`;
        if (!upload.key.startsWith(prefix)) {
          throw new Error("Invalid media upload key");
        }

        return {
          id: nanoid(),
          userId,
          type: upload.type,
          url: storageService.buildPublicUrlForKey(upload.key),
          usageCount: 0,
          uploadedAt: now
        };
      });

      const created = await db.insert(userMedia).values(rows).returning();

      const signedUrls = await Promise.all(
        created.map((media) => getSignedDownloadUrlSafe(media.url))
      );
      const signedMedia = created.map((media, index) => ({
        ...media,
        url: signedUrls[index] ?? media.url
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

      return signedMedia;
    },
    {
      actionName: "createUserMediaRecords",
      context: { userId, uploadCount: uploads.length },
      errorMessage: "Failed to save media. Please try again."
    }
  );
}
