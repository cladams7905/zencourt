// Type definitions for metadata
export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  size: number;
  lastModified: number;
};

export type ProjectStatus = "uploading" | "analyzing" | "draft" | "published";

export type ProjectMetadata = {
  generationJobs?: any[];
  videoThumbnailUrl?: string;
  videoResolution?: { width: number; height: number };
  completedAt?: string;
  error?: {
    message: string;
    type: string;
    retryable: boolean;
    failedAt: string;
  };
};
