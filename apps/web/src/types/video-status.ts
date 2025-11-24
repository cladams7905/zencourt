import type { VideoStatus } from "@shared/types/models";

export interface VideoJobUpdateEvent {
  projectId: string;
  jobId: string;
  status: VideoStatus;
  videoUrl?: string | null;
  errorMessage?: string | null;
  roomId?: string | null;
  roomName?: string | null;
  sortOrder?: number | null;
}

export interface FinalVideoUpdateEvent {
  projectId: string;
  status: "completed" | "failed";
  finalVideoUrl?: string | null;
  thumbnailUrl?: string | null;
  duration?: number | null;
  errorMessage?: string | null;
}

export interface InitialVideoStatusPayload {
  jobs: VideoJobUpdateEvent[];
  finalVideo?: FinalVideoUpdateEvent;
}
