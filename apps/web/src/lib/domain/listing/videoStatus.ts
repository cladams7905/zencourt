import type {
  GENERATION_MODELS,
  VideoOrientation,
  VideoStatus
} from "@shared/types/models";

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
  orientation?: VideoOrientation | null;
  generationModel?: GENERATION_MODELS | null;
  isPriorityCategory?: boolean;
  sortOrder?: number | null;
}

export interface InitialVideoStatusPayload {
  jobs: VideoJobUpdateEvent[];
}
