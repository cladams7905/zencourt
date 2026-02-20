import type { ListingClip } from "@/services/render/providers/remotion/composition/ListingVideo";

export type RenderJobData = {
  videoId: string;
  listingId: string;
  userId: string;
  clips: ListingClip[];
  orientation: "vertical" | "landscape";
  transitionDurationSeconds?: number;
};

export type RenderJobState =
  | {
      status: "queued";
      data: RenderJobData;
      cancel: () => void;
    }
  | {
      status: "in-progress";
      progress: number;
      data: RenderJobData;
      cancel: () => void;
    }
  | {
      status: "completed";
      data: RenderJobData;
      videoUrl?: string;
      thumbnailUrl?: string;
    }
  | {
      status: "failed";
      data: RenderJobData;
      error: string;
    }
  | {
      status: "canceled";
      data: RenderJobData;
      reason?: string;
    };

export type RenderCreateRequest = RenderJobData;

export type RenderCreateResult = {
  jobId: string;
};
