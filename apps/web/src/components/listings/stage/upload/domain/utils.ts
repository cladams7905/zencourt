import type { ImageMetadata } from "@shared/types/models";

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

export const buildProcessingRoute = (
  listingId: string,
  count: number,
  batchStartedAt: number
) => {
  const batchParam =
    count > 0
      ? `?batch=${count}&batchStartedAt=${batchStartedAt}`
      : `?batchStartedAt=${batchStartedAt}`;

  return `/listings/${listingId}/stage/categorize/processing${batchParam}`;
};

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
