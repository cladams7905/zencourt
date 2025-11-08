import { VideoGenerationJob } from "@/types/video-generation";

export type ProjectStatus = "uploading" | "analyzing" | "draft" | "published";

export type ProjectMetadata = {
  generationJobs?: VideoGenerationJob[];
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
