import type { DBVideoGenJob } from "@db/types/models";
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
  status: "queued" | "in-progress" | "completed" | "failed" | "canceled";
  progress?: number;
  error?: string;
  artifactReady?: boolean;
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

  switch (job.status) {
    case "queued":
      return {
        status: 200,
        body: { success: true, job: { status: "queued", progress: 0 } }
      };
    case "in-progress":
      return {
        status: 200,
        body: {
          success: true,
          job: { status: "in-progress", progress: job.progress ?? 0 }
        }
      };
    case "completed":
      return {
        status: 200,
        body: {
          success: true,
          job: {
            status: "completed",
            progress: 1,
            artifactReady: Boolean(job.artifactReady)
          }
        }
      };
    case "failed":
      return {
        status: 200,
        body: {
          success: true,
          job: { status: "failed", error: job.error }
        }
      };
    case "canceled":
      return {
        status: 200,
        body: { success: true, job: { status: "canceled" } }
      };
    default:
      return { status: 404, body: { success: false, error: "Job not found" } };
  }
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
