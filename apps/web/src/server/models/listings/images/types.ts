import type { ImageMetadata } from "@shared/types/models";

export type ListingImageUploadRequest = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

export type ListingImageSignedUpload = {
  id: string;
  fileName: string;
  key: string;
  uploadUrl: string;
  publicUrl: string;
};

export type ListingImageUploadUrlResult = {
  uploads: ListingImageSignedUpload[];
  failed: Array<{ id: string; fileName: string; error: string }>;
};

export type ListingImageRecordInput = {
  key: string;
  fileName: string;
  publicUrl: string;
  metadata?: ImageMetadata;
};

export type ListingImageUpdate = {
  id: string;
  category: string | null;
  isPrimary?: boolean | null;
};
