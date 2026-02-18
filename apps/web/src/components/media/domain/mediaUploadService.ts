import type { UserMediaType } from "@shared/types/models";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@shared/utils/mediaUpload";
import { formatBytes } from "@web/src/lib/core/formatting/bytes";

export const validateMediaFile = (file: File) => {
  if (file.type.startsWith("image/")) {
    if (file.size > MAX_IMAGE_BYTES) {
      return {
        accepted: false,
        error: `"${file.name}" exceeds the ${formatBytes(MAX_IMAGE_BYTES)} image limit.`
      };
    }
    return { accepted: true };
  }

  if (file.type.startsWith("video/")) {
    if (file.size > MAX_VIDEO_BYTES) {
      return {
        accepted: false,
        error: `"${file.name}" exceeds the ${formatBytes(MAX_VIDEO_BYTES)} video limit.`
      };
    }
    return { accepted: true };
  }

  return {
    accepted: false,
    error: `"${file.name}" is not a supported file type.`
  };
};

export const buildUploadRecordInput = (input: {
  upload: { key: string; type?: string };
  file: File;
  thumbnailKey?: string;
  thumbnailFailed: boolean;
}) => {
  if (!input.upload.type) {
    throw new Error("Missing media type.");
  }

  return {
    key: input.upload.key,
    type: input.upload.type as UserMediaType,
    thumbnailKey: input.thumbnailKey
  };
};

export const getMediaFileMetaLabel = (file: File) => {
  return `${formatBytes(file.size)} • ${file.type.startsWith("image/") ? "Image" : "Video"}`;
};
