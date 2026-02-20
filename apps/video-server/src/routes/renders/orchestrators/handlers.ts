import type { DBVideoGenJob } from "@shared/types/models/db.video";
import type { RenderJobData } from "@/services/render";
import {
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";

type RenderContext = {
  videoId: string;
  listingId: string;
  userId: string;
};

type RenderQueueJob = {
  status: "queued" | "in-progress" | "completed" | "failed";
};

type RenderQueuePort = {
  createJob: (
    data: RenderJobData,
    callbacks?: {
      onStart: (data: RenderJobData) => Promise<void>;
      onProgress: (progress: number, data: RenderJobData) => Promise<void>;
      onComplete: (
        result: {
          videoBuffer: Buffer;
          thumbnailBuffer: Buffer;
          durationSeconds: number;
          fileSize: number;
        },
        data: RenderJobData
      ) => Promise<Record<string, never>>;
      onError: (error: Error, data: RenderJobData) => Promise<void>;
    },
    jobIdOverride?: string
  ) => string;
  getJob: (jobId: string) => RenderQueueJob | undefined;
  cancelJob: (jobId: string) => boolean;
};

export async function handleCreateRender(
  input: { videoId: string; textOverlaysByJobId?: Record<string, unknown> },
  deps: {
    fetchVideoContext: (videoId: string) => Promise<RenderContext | null>;
    fetchVideoJobs: (videoId: string) => Promise<DBVideoGenJob[]>;
    filterAndSortCompletedJobs: (jobs: DBVideoGenJob[]) => DBVideoGenJob[];
    buildRenderJobData: (
      context: RenderContext,
      completedJobs: DBVideoGenJob[],
      watermarkOpacity: number,
      textOverlaysByJobId?: Record<string, unknown>
    ) => RenderJobData;
    renderQueue: RenderQueuePort;
  }
): Promise<{ success: true; jobId: string }> {
  const videoContext = await deps.fetchVideoContext(input.videoId);
  if (!videoContext?.listingId || !videoContext?.userId) {
    throw new VideoProcessingError(
      "Render request referenced a video without context",
      VideoProcessingErrorType.JOB_NOT_FOUND,
      {
        statusCode: 404,
        context: { videoId: input.videoId }
      }
    );
  }

  const jobs = await deps.fetchVideoJobs(input.videoId);
  const completedJobs = deps.filterAndSortCompletedJobs(jobs);
  if (completedJobs.length === 0) {
    throw new VideoProcessingError(
      "Render request has no completed jobs",
      VideoProcessingErrorType.INVALID_INPUT,
      {
        statusCode: 400,
        context: { videoId: input.videoId }
      }
    );
  }

  const renderData = deps.buildRenderJobData(
    videoContext,
    completedJobs,
    0,
    input.textOverlaysByJobId
  );

  const jobId = deps.renderQueue.createJob(
    renderData,
    {
      onStart: async (_data: RenderJobData) => {},
      onProgress: async (_progress: number, _data: RenderJobData) => {},
      onComplete: async (
        _result: {
          videoBuffer: Buffer;
          thumbnailBuffer: Buffer;
          durationSeconds: number;
          fileSize: number;
        },
        _data: RenderJobData
      ) => {
        return {};
      },
      onError: async (_error: Error, _data: RenderJobData) => {}
    },
    undefined
  );

  return { success: true, jobId };
}

export function handleGetRenderJob(
  jobId: string,
  queue: RenderQueuePort
): { status: 200 | 404; body: { success: boolean; error?: string; job?: RenderQueueJob } } {
  const job = queue.getJob(jobId);
  if (!job) {
    return { status: 404, body: { success: false, error: "Job not found" } };
  }
  return { status: 200, body: { success: true, job } };
}

export function handleCancelRenderJob(
  jobId: string,
  queue: RenderQueuePort
): { status: 200 | 400 | 404; body: { success: boolean; error?: string; message?: string } } {
  const job = queue.getJob(jobId);
  if (!job) {
    return { status: 404, body: { success: false, error: "Job not found" } };
  }
  if (job.status !== "queued" && job.status !== "in-progress") {
    return {
      status: 400,
      body: { success: false, error: "Job is not cancellable" }
    };
  }
  const cancelled = queue.cancelJob(jobId);
  if (!cancelled) {
    return { status: 400, body: { success: false, error: "Cancel failed" } };
  }
  return { status: 200, body: { success: true, message: "Job cancelled" } };
}
