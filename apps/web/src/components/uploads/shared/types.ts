export type PendingUpload = {
  id: string;
  file: File;
  previewUrl: string;
  previewType: "image" | "video";
  progress: number;
  status: "ready" | "uploading" | "done" | "error";
};

export type UploadRequest = {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

export type UploadFailure = {
  id: string;
};

export type UploadDescriptor = {
  id: string;
  uploadUrl: string;
  key: string;
  type?: string;
  fileName?: string;
  publicUrl?: string;
  thumbnailUploadUrl?: string;
  thumbnailKey?: string;
};

export type UploadDialogProps<TRecord> = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  accept: string;
  dropTitle: string;
  dropSubtitle: string;
  primaryActionLabel: string;
  selectedLabel?: string;
  errorMessage?: string;
  tipsTitle?: string;
  tipsItems?: string[];
  fileValidator: (file: File) => { accepted: boolean; error?: string };
  getUploadUrls: (
    requests: UploadRequest[]
  ) => Promise<{ uploads: UploadDescriptor[]; failed: UploadFailure[] }>;
  buildRecordInput: (args: {
    upload: UploadDescriptor;
    file: File;
    thumbnailKey?: string;
    thumbnailFailed: boolean;
  }) => TRecord | Promise<TRecord>;
  onCreateRecords: (records: TRecord[]) => Promise<void>;
  onSuccess?: () => void;
  onUploadsComplete?: (summary: {
    count: number;
    batchStartedAt: number;
  }) => void;
  fileMetaLabel?: (file: File) => string;
  thumbnailFailureMessage?: (count: number) => string;
  maxFiles?: number;
  maxImageBytes?: number;
  compressDriveImages?: boolean;
  compressOversizeImages?: boolean;
};
