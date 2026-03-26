import type { UserMediaType } from "@db/types/models";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@shared/utils/mediaUpload";
import { formatBytes } from "@web/src/lib/core/formatting/bytes";

async function getVideoDurationSeconds(file: File): Promise<number | null> {
  if (typeof document === "undefined" || !file.type.startsWith("video/")) {
    return null;
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const duration = await new Promise<number | null>((resolve) => {
      const video = document.createElement("video");
      const cleanup = () => {
        video.removeAttribute("src");
        video.load();
      };

      video.preload = "metadata";
      video.onloadedmetadata = () => {
        const nextDuration = Number.isFinite(video.duration) && video.duration > 0
          ? Number(video.duration.toFixed(2))
          : null;
        cleanup();
        resolve(nextDuration);
      };
      video.onerror = () => {
        cleanup();
        resolve(null);
      };
      video.src = objectUrl;
    });

    return duration;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

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

export const buildUploadRecordInput = async (input: {
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
    thumbnailKey: input.thumbnailKey,
    durationSeconds: await getVideoDurationSeconds(input.file)
  };
};

export const getMediaFileMetaLabel = (file: File) => {
  return `${formatBytes(file.size)} • ${file.type.startsWith("image/") ? "Image" : "Video"}`;
};
