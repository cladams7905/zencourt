import { rm } from "fs/promises";
import { makeCancelSignal } from "@remotion/renderer";
import { nanoid } from "nanoid";
import logger from "@/config/logger";
import type { RenderJobData, RenderJobState } from "./types";
import type { RenderProvider } from "./ports";

type RenderCompletion = {
  videoUrl?: string;
  thumbnailUrl?: string;
  artifactPath?: string;
};

type RenderHandlers = {
  onStart?: (data: RenderJobData) => Promise<void>;
  onProgress?: (progress: number, data: RenderJobData) => Promise<void>;
  mapProgress?: (progress: number) => number;
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
  timeoutMs?: number;
};

class RenderQueue {
  private jobs = new Map<string, RenderJobState>();
  private pending: Array<{ jobId: string; handlers?: RenderHandlers }> = [];
  private handlersByJobId = new Map<string, RenderHandlers | undefined>();
  private activeCount = 0;
  private maxConcurrent = Number(process.env.RENDER_CONCURRENCY) || 3;
  private artifactCleanupTimers = new Map<string, NodeJS.Timeout>();
  private jobTimeoutTimers = new Map<string, NodeJS.Timeout>();
  private jobTimeoutMs = Number(process.env.REEL_EXPORT_TIMEOUT_MS) || 5 * 60 * 1000;

  constructor(private provider: RenderProvider) {}

  getJob(jobId: string): RenderJobState | undefined {
    return this.jobs.get(jobId);
  }

  updateJobPhase(
    jobId: string,
    phase: "upscaling" | "rendering",
    progress?: number
  ): void {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "in-progress") {
      return;
    }

    this.jobs.set(jobId, {
      ...job,
      phase,
      ...(typeof progress === "number" ? { progress } : {})
    });
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (job.status !== "queued" && job.status !== "in-progress") {
      return false;
    }
    job.cancel();
    const current = this.jobs.get(jobId);
    if (current && (current.status === "queued" || current.status === "in-progress")) {
      this.jobs.set(jobId, {
        status: "canceled",
        data: current.data,
        reason: "User requested cancel"
      });
    }
    this.clearJobTimeout(jobId);
    this.handlersByJobId.delete(jobId);
    return true;
  }

  async clearArtifact(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "completed" || !job.artifactPath) {
      return false;
    }

    const cleanupTimer = this.artifactCleanupTimers.get(jobId);
    if (cleanupTimer) {
      clearTimeout(cleanupTimer);
      this.artifactCleanupTimers.delete(jobId);
    }

    await rm(job.artifactPath, { force: true }).catch(() => undefined);
    this.jobs.set(jobId, {
      ...job,
      artifactPath: undefined,
      artifactReady: false
    });
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

    this.handlersByJobId.set(jobId, handlers);
    this.scheduleJobTimeout(jobId, handlers?.timeoutMs);
    this.pending.push({ jobId, handlers });
    this.processNext();
    return jobId;
  }

  private processNext(): void {
    if (this.activeCount >= this.maxConcurrent) return;
    const next = this.pending.shift();
    if (!next) return;
    this.activeCount += 1;
    this.processRender(next.jobId, next.handlers)
      .catch(() => {})
      .finally(() => {
        this.activeCount = Math.max(0, this.activeCount - 1);
        this.processNext();
      });
  }

  private async processRender(jobId: string, handlers?: RenderHandlers): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "queued") return;

    const { cancel, cancelSignal } = makeCancelSignal();
    this.jobs.set(jobId, {
      status: "in-progress",
      phase: "rendering",
      progress: 0,
      data: job.data,
      cancel
    });

    try {
      if (handlers?.onStart) {
        await handlers.onStart(job.data);
      }

      const jobAfterStart = this.jobs.get(jobId);
      if (!jobAfterStart || jobAfterStart.status !== "in-progress") {
        return;
      }

      this.jobs.set(jobId, {
        status: "in-progress",
        phase: "rendering",
        progress: 0,
        data: job.data,
        cancel
      });

      const result = await this.provider.renderListingVideo({
        clips: job.data.clips,
        orientation: job.data.orientation,
        videoId: job.data.videoId,
        cancelSignal,
        onProgress: (progress) => {
          const currentJob = this.jobs.get(jobId);
          if (!currentJob || currentJob.status !== "in-progress") {
            return;
          }

          const resolvedProgress = handlers?.mapProgress
            ? handlers.mapProgress(progress)
            : progress;

          this.jobs.set(jobId, {
            status: "in-progress",
            phase: "rendering",
            progress: resolvedProgress,
            data: job.data,
            cancel
          });
          if (handlers?.onProgress) {
            handlers.onProgress(resolvedProgress, job.data).catch((error) => {
              logger.warn(
                { jobId, error: error instanceof Error ? error.message : String(error) },
                "[RenderQueue] Failed to update progress handler"
              );
            });
          }
        }
      });

      const completion = handlers?.onComplete
        ? await handlers.onComplete(result, job.data)
        : undefined;

      const currentJob = this.jobs.get(jobId);
      if (!currentJob || currentJob.status !== "in-progress") {
        return;
      }

      this.jobs.set(jobId, {
        status: "completed",
        data: job.data,
        videoUrl: completion?.videoUrl,
        thumbnailUrl: completion?.thumbnailUrl,
        artifactReady: Boolean(completion?.artifactPath),
        artifactPath: completion?.artifactPath
      });
      this.clearJobTimeout(jobId);
      this.handlersByJobId.delete(jobId);
      this.scheduleArtifactCleanup(jobId, completion?.artifactPath);
    } catch (error) {
      const currentJob = this.jobs.get(jobId);
      if (currentJob?.status === "failed") {
        this.clearJobTimeout(jobId);
        this.handlersByJobId.delete(jobId);
        return;
      }

      logger.error(
        { jobId, error: error instanceof Error ? error.message : String(error) },
        "[RenderQueue] Render failed"
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
      this.clearJobTimeout(jobId);
      this.handlersByJobId.delete(jobId);
    }
  }

  private scheduleJobTimeout(jobId: string, timeoutOverrideMs?: number): void {
    const existingTimer = this.jobTimeoutTimers.get(jobId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timeoutMs = timeoutOverrideMs ?? this.jobTimeoutMs;
    const timer = setTimeout(() => {
      void this.failTimedOutJob(jobId, timeoutMs);
    }, timeoutMs);
    timer.unref?.();
    this.jobTimeoutTimers.set(jobId, timer);
  }

  private clearJobTimeout(jobId: string): void {
    const timer = this.jobTimeoutTimers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.jobTimeoutTimers.delete(jobId);
    }
  }

  private async failTimedOutJob(jobId: string, timeoutMs: number): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || (job.status !== "queued" && job.status !== "in-progress")) {
      this.clearJobTimeout(jobId);
      this.handlersByJobId.delete(jobId);
      return;
    }

    if (job.status === "in-progress") {
      job.cancel();
    }

    const error = new Error(
      `Render timed out after ${Math.round(timeoutMs / 1000)} seconds`
    );

    logger.error(
      { jobId, timeoutMs, status: job.status },
      "[RenderQueue] Render timed out"
    );

    this.jobs.set(jobId, {
      status: "failed",
      data: job.data,
      error: error.message
    });
    this.clearJobTimeout(jobId);

    const handlers = this.handlersByJobId.get(jobId);
    if (handlers?.onError) {
      await handlers.onError(error, job.data);
    }
    this.handlersByJobId.delete(jobId);
  }

  private scheduleArtifactCleanup(
    jobId: string,
    artifactPath: string | undefined
  ): void {
    if (!artifactPath) {
      return;
    }

    const existingTimer = this.artifactCleanupTimers.get(jobId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const ttlMs = Number(process.env.REEL_EXPORT_ARTIFACT_TTL_MS) || 15 * 60 * 1000;
    const timer = setTimeout(() => {
      void this.clearArtifact(jobId);
    }, ttlMs);
    timer.unref?.();
    this.artifactCleanupTimers.set(jobId, timer);
  }
}

export function createRenderQueue(provider: RenderProvider): RenderQueue {
  return new RenderQueue(provider);
}
