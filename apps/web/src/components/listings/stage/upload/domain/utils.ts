import type { ImageMetadata } from "@shared/types/models";

/** Minimum recommended pixel size for listing photos (matches upload guidance copy). */
export const RECOMMENDED_LISTING_IMAGE_WIDTH = 1280;
export const RECOMMENDED_LISTING_IMAGE_HEIGHT = 720;

export type ListingUploadRecordInput = {
  key: string;
  fileName: string;
  publicUrl: string;
  metadata?: ImageMetadata;
};

type UploadDescriptor = {
  key: string;
  fileName?: string;
  publicUrl?: string;
};

export const validateImageFile = (file: File) => {
  if (file.type.startsWith("image/")) {
    return { accepted: true as const };
  }
  return {
    accepted: false as const,
    error: "Only image files are supported."
  };
};

const readImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth;
      const height = image.naturalHeight;
      URL.revokeObjectURL(objectUrl);
      resolve({ width, height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image could not be read."));
    };
    image.src = objectUrl;
  });

export const validateListingUploadRequirements = async ({
  file,
  maxImageBytes
}: {
  file: File;
  maxImageBytes: number;
}): Promise<{ accepted: true } | { accepted: false; error: string }> => {
  if (!file.type.startsWith("image/")) {
    return {
      accepted: false,
      error: `"${file.name}" is not an image.`
    };
  }

  if (file.size > maxImageBytes) {
    return {
      accepted: false,
      error: `"${file.name}" exceeds the 5.0 MB limit.`
    };
  }

  try {
    const { width, height } = await readImageDimensions(file);
    if (width <= height) {
      return {
        accepted: false,
        error: `"${file.name}" must be landscape orientation.`
      };
    }
  } catch {
    return {
      accepted: false,
      error: `"${file.name}" could not be validated. Please try another image.`
    };
  }

  return { accepted: true };
};

/**
 * Returns human-readable lines for tooltip when an image does not meet listing recommendations
 * (minimum dimensions and/or landscape orientation).
 */
export function getListingImageRecommendationIssues(
  width: number,
  height: number
): string[] {
  const issues: string[] = [];
  if (
    width < RECOMMENDED_LISTING_IMAGE_WIDTH ||
    height < RECOMMENDED_LISTING_IMAGE_HEIGHT
  ) {
    issues.push(
      `This image is ${width}×${height}px. For best results, use at least ${RECOMMENDED_LISTING_IMAGE_WIDTH}×${RECOMMENDED_LISTING_IMAGE_HEIGHT}px.`
    );
  }
  if (width <= height) {
    issues.push("Listing photos should be landscape (wider than tall).");
  }
  return issues;
}

export const buildListingUploadRecordInput = (
  upload: UploadDescriptor,
  metadata?: ImageMetadata
): ListingUploadRecordInput => {
  if (!upload.fileName || !upload.publicUrl) {
    throw new Error("Listing upload is missing metadata.");
  }

  return {
    key: upload.key,
    fileName: upload.fileName,
    publicUrl: upload.publicUrl,
    metadata
  };
};
