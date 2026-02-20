import { makeCancelSignal } from "@remotion/renderer";
import { nanoid } from "nanoid";
import logger from "@/config/logger";
import { remotionRenderService } from "./remotionRenderService";
import type { ListingClip } from "@/lib/remotion/ListingVideo";

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
    };

type RenderCompletion = {
  videoUrl?: string;
  thumbnailUrl?: string;
};

type RenderHandlers = {
  onStart?: (data: RenderJobData) => Promise<void>;
  onProgress?: (progress: number, data: RenderJobData) => Promise<void>;
  onComplete?: (
    result: {
      videoBuffer: Buffer;
      thumbnailBuffer: Buffer;
      durationSeconds: number;
      fileSize: number;
    },
    data: RenderJobData
  ) => Promise<RenderCompletion>;
  onError?: (error: Error, data: RenderJobData) => Promise<void>;
};

class RemotionRenderQueue {
  private jobs = new Map<string, RenderJobState>();
  private pending: Array<{
    jobId: string;
    handlers?: RenderHandlers;
  }> = [];
  private activeCount = 0;
  private maxConcurrent = Number(process.env.RENDER_CONCURRENCY) || 3;

  getJob(jobId: string): RenderJobState | undefined {
    return this.jobs.get(jobId);
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }
    if (job.status !== "queued" && job.status !== "in-progress") {
      return false;
    }
    job.cancel();
    return true;
  }

  createJob(
    data: RenderJobData,
    handlers?: RenderHandlers,
    jobIdOverride?: string
  ): string {
    const jobId = jobIdOverride ?? nanoid();

    this.jobs.set(jobId, {
      status: "queued",
      data,
      cancel: () => {
        this.jobs.delete(jobId);
      }
    });

    this.pending.push({ jobId, handlers });
    this.processNext();
    return jobId;
  }

  private processNext(): void {
    if (this.activeCount >= this.maxConcurrent) {
      return;
    }
    const next = this.pending.shift();
    if (!next) {
      return;
    }
    this.activeCount += 1;
    this.processRender(next.jobId, next.handlers)
      .catch(() => {
        // errors handled in processRender
      })
      .finally(() => {
        this.activeCount = Math.max(0, this.activeCount - 1);
        this.processNext();
      });
  }

  private async processRender(
    jobId: string,
    handlers?: RenderHandlers
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "queued") {
      return;
    }

    const { cancel, cancelSignal } = makeCancelSignal();
    this.jobs.set(jobId, {
      status: "in-progress",
      progress: 0,
      data: job.data,
      cancel
    });

    if (handlers?.onStart) {
      await handlers.onStart(job.data);
    }

    try {
      const result = await remotionRenderService.renderListingVideo({
        clips: job.data.clips,
        orientation: job.data.orientation,
        transitionDurationSeconds: job.data.transitionDurationSeconds,
        videoId: job.data.videoId,
        cancelSignal,
        onProgress: (progress) => {
          this.jobs.set(jobId, {
            status: "in-progress",
            progress,
            data: job.data,
            cancel
          });
          if (handlers?.onProgress) {
            handlers.onProgress(progress, job.data).catch((error) => {
              logger.warn(
                {
                  jobId,
                  error: error instanceof Error ? error.message : String(error)
                },
                "[RemotionRenderQueue] Failed to update progress handler"
              );
            });
          }
        }
      });

      const completion = handlers?.onComplete
        ? await handlers.onComplete(result, job.data)
        : undefined;

      this.jobs.set(jobId, {
        status: "completed",
        data: job.data,
        videoUrl: completion?.videoUrl,
        thumbnailUrl: completion?.thumbnailUrl
      });
    } catch (error) {
      logger.error(
        {
          jobId,
          error: error instanceof Error ? error.message : String(error)
        },
        "[RemotionRenderQueue] Render failed"
      );

      if (handlers?.onError) {
        await handlers.onError(
          error instanceof Error ? error : new Error(String(error)),
          job.data
        );
      }

      this.jobs.set(jobId, {
        status: "failed",
        data: job.data,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
}

export const remotionRenderQueue = new RemotionRenderQueue();
