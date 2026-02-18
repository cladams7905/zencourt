import type { UserMediaType } from "@shared/types/models";

export type UserMediaUploadRequest = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

export type UserMediaSignedUpload = {
  id: string;
  fileName: string;
  type: UserMediaType;
  key: string;
  uploadUrl: string;
  publicUrl: string;
  thumbnailKey?: string;
  thumbnailUploadUrl?: string;
  thumbnailPublicUrl?: string;
};

export type UserMediaUploadUrlResult = {
  uploads: UserMediaSignedUpload[];
  failed: Array<{ id: string; fileName: string; error: string }>;
};

export type UserMediaRecordInput = {
  key: string;
  type: UserMediaType;
  thumbnailKey?: string;
};
