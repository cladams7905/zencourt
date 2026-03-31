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
