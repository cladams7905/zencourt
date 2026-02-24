import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@shared/utils/mediaUpload";
import {
  getListingImagePath,
  getUserMediaFolder,
  getUserMediaPath,
  getUserMediaThumbnailFolder,
  getUserMediaThumbnailPath
} from "@shared/utils/storagePaths";
import type {
  ListingImageUploadRequest,
  ListingImageUploadUrlResult
} from "@web/src/server/models/listingImages/types";
import type {
  UserMediaRecordInput,
  UserMediaUploadRequest,
  UserMediaUploadUrlResult
} from "@web/src/server/models/userMedia/types";
import {
  buildUploadFailure,
  isImageMimeType,
  isVideoMimeType,
  toMegabytes
} from "@web/src/server/models/shared/uploadValidation";
import storageService from "./service";

const MAX_LISTING_IMAGE_COUNT = 20;

export async function prepareListingImageUploadUrls(
  userId: string,
  listingId: string,
  files: ListingImageUploadRequest[],
  existingImageCount: number
): Promise<ListingImageUploadUrlResult> {
  if (!files || files.length === 0) {
    throw new Error("No files provided for upload");
  }

  if (existingImageCount + files.length > MAX_LISTING_IMAGE_COUNT) {
    throw new Error("Listings can contain up to 20 photos.");
  }

  const uploads = [] as ListingImageUploadUrlResult["uploads"];
  const failed = [] as ListingImageUploadUrlResult["failed"];
  const maxImageMb = toMegabytes(MAX_IMAGE_BYTES);

  for (const file of files) {
    if (!isImageMimeType(file.fileType)) {
      failed.push(
        buildUploadFailure(file.id, file.fileName, "Only image files are supported.")
      );
      continue;
    }

    if (file.fileSize > MAX_IMAGE_BYTES) {
      failed.push(
        buildUploadFailure(
          file.id,
          file.fileName,
          `Images must be ${maxImageMb} MB or smaller.`
        )
      );
      continue;
    }

    const key = getListingImagePath(userId, listingId, file.fileName);
    const signed = await storageService.getSignedUploadUrl(key, file.fileType);
    if (!signed.success) {
      failed.push(buildUploadFailure(file.id, file.fileName, signed.error));
      continue;
    }

    uploads.push({
      id: file.id,
      fileName: file.fileName,
      key,
      uploadUrl: signed.url,
      publicUrl: storageService.buildPublicUrlForKey(key)
    });
  }

  return { uploads, failed };
}

type UploadFailure = UserMediaUploadUrlResult["failed"][number];

function buildUploadContext(userId: string) {
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

export async function prepareUserMediaUploadUrls(
  userId: string,
  files: UserMediaUploadRequest[]
): Promise<UserMediaUploadUrlResult> {
  if (!files || files.length === 0) {
    throw new Error("No files provided for upload");
  }

  const uploads = [] as UserMediaUploadUrlResult["uploads"];
  const failed = [] as UserMediaUploadUrlResult["failed"];
  const ctx = buildUploadContext(userId);

  for (const file of files) {
    if (isImageMimeType(file.fileType)) {
      if (file.fileSize > MAX_IMAGE_BYTES) {
        failed.push(
          buildUploadFailure(
            file.id,
            file.fileName,
            `Images must be ${ctx.maxImageMb} MB or smaller.`
          )
        );
        continue;
      }

      const key = getUserMediaPath(ctx.userId, "image", file.fileName);
      const signed = await storageService.getSignedUploadUrl(key, file.fileType);
      if (!signed.success) {
        failed.push(buildUploadFailure(file.id, file.fileName, signed.error));
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

    if (isVideoMimeType(file.fileType)) {
      if (file.fileSize > MAX_VIDEO_BYTES) {
        failed.push(
          buildUploadFailure(
            file.id,
            file.fileName,
            `Videos must be ${ctx.maxVideoMb} MB or smaller.`
          )
        );
        continue;
      }

      const key = getUserMediaPath(ctx.userId, "video", file.fileName);
      const signed = await storageService.getSignedUploadUrl(key, file.fileType);
      if (!signed.success) {
        failed.push(buildUploadFailure(file.id, file.fileName, signed.error));
        continue;
      }

      const thumbnailKey = getUserMediaThumbnailPath(ctx.userId, file.fileName);
      const thumbnailSigned = await storageService.getSignedUploadUrl(
        thumbnailKey,
        "image/jpeg"
      );
      if (!thumbnailSigned.success) {
        failed.push(buildUploadFailure(file.id, file.fileName, thumbnailSigned.error));
        continue;
      }

      uploads.push({
        id: file.id,
        fileName: file.fileName,
        type: "video",
        key,
        uploadUrl: signed.url,
        publicUrl: storageService.buildPublicUrlForKey(key),
        thumbnailKey,
        thumbnailUploadUrl: thumbnailSigned.url,
        thumbnailPublicUrl: storageService.buildPublicUrlForKey(thumbnailKey)
      });
      continue;
    }

    failed.push(unsupportedFileTypeFailure(file));
  }

  return { uploads, failed };
}

export function mapUserMediaRecordInputs(
  userId: string,
  uploads: UserMediaRecordInput[]
): Array<{ type: UserMediaRecordInput["type"]; url: string; thumbnailUrl: string | null }> {
  const imagePrefix = `${getUserMediaFolder(userId, "image")}/`;
  const videoPrefix = `${getUserMediaFolder(userId, "video")}/`;
  const thumbnailPrefix = `${getUserMediaThumbnailFolder(userId)}/`;

  return uploads.map((upload) => {
    const prefix = upload.type === "video" ? videoPrefix : imagePrefix;
    if (!upload.key.startsWith(prefix)) {
      throw new Error("Invalid media upload key");
    }

    if (upload.thumbnailKey && !upload.thumbnailKey.startsWith(thumbnailPrefix)) {
      throw new Error("Invalid media thumbnail upload key");
    }

    return {
      type: upload.type,
      url: storageService.buildPublicUrlForKey(upload.key),
      thumbnailUrl: upload.thumbnailKey
        ? storageService.buildPublicUrlForKey(upload.thumbnailKey)
        : null
    };
  });
}
