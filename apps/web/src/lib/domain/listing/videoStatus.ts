import type {
  VideoStatus
} from "@db/types/models";
import type { GENERATION_MODELS, VideoOrientation } from "@shared/types/models";

export interface VideoJobUpdateEvent {
  listingId: string;
  jobId: string;
  status: VideoStatus;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  errorMessage?: string | null;
  roomId?: string | null;
  roomName?: string | null;
  category?: string | null;
  clipIndex?: number | null;
  durationSeconds?: number | null;
  orientation?: VideoOrientation | null;
  generationModel?: GENERATION_MODELS | null;
  prompt?: string | null;
  imageUrls?: string[] | null;
  isPriorityCategory?: boolean;
  sortOrder?: number | null;
}

export interface InitialVideoStatusPayload {
  jobs: VideoJobUpdateEvent[];
}

export interface VideoGenerationBatchStatusPayload {
  batchId: string;
  status: VideoStatus;
  errorMessage?: string | null;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  canceledJobs: number;
  processingJobs: number;
  pendingJobs: number;
  isTerminal: boolean;
  allSucceeded: boolean;
}
