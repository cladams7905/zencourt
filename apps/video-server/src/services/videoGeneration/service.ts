/**
 * Video Generation Service
 * Handles the job-based video generation workflow
 * Reads video_gen_jobs from DB, dispatches to provider strategies,
 * and manages state transitions
 */

import logger from "@/config/logger";
import type {
  VideoServerGenerateRequest,
  VideoJobResult
} from "@shared/types/api";
import type { DBVideoGenJob } from "@db/types/models";
import { TTLCache } from "@/services/videoGeneration/domain/cache";
import { startGenerationOrchestrator } from "@/services/videoGeneration/orchestrators/startGeneration";
import { handleFalWebhookOrchestrator } from "@/services/videoGeneration/orchestrators/handleFalWebhook";
import {
  sendJobCompletionWebhookOrchestrator,
  sendJobFailureWebhookOrchestrator
} from "@/services/videoGeneration/orchestrators/webhookDelivery";
import { evaluateJobCompletionOrchestrator } from "@/services/videoGeneration/orchestrators/evaluateCompletion";
import { dispatchJobOrchestrator } from "@/services/videoGeneration/orchestrators/dispatchJob";
import { handleProviderSuccessOrchestrator } from "@/services/videoGeneration/orchestrators/providerSuccess";
import { reconcileRunwayJobOrchestrator } from "@/services/videoGeneration/orchestrators/reconcileRunwayJob";
import { reconcileWaveSpeedJobOrchestrator } from "@/services/videoGeneration/orchestrators/reconcileWaveSpeedJob";
import { cancelBatchGenerationOrchestrator } from "@/services/videoGeneration/orchestrators/cancelBatchGeneration";
import { handleJobExecutionFailureOrchestrator } from "@/services/videoGeneration/orchestrators/handleJobExecutionFailure";
import { videoGenerationDb } from "@/services/videoGeneration/adapters/db";
import { ProviderDispatchFacade } from "@/services/videoGeneration/facades/providerFacade";
import {
  fallbackProviderStrategies,
  primaryProviderStrategies
} from "@/services/videoGeneration/strategies";
import { storageService } from "@/services/storage";
import { webhookService } from "@/services/webhook";
import { runWithConcurrency } from "@/services/videoGeneration/domain/concurrency";
import {
  prepareProviderSourceImage,
  resolveProviderSourceImageSize
} from "@/services/videoGeneration/domain/providerSourceImage";
import { FalWebhookPayload } from "@/routes/webhooks/domain/requests";
import type { WaveSpeedWebhookPayload } from "@/routes/webhooks/domain/requests";
import { runwayService } from "@/services/providers/runway";
import { runwayTaskSlots } from "@/services/videoGeneration/domain/runwayTaskSlots";
import { waveSpeedService } from "@/services/providers/wavespeed";
import { waveSpeedTaskSlots } from "@/services/videoGeneration/domain/providerTaskSlots";
import { cancelBatchById as markBatchCanceled } from "@/services/videoGeneration/adapters/cancel";

interface GenerationResult {
  jobsStarted: number;
  failedJobs: string[];
}

interface VideoContext {
  videoId: string;
  listingId: string;
  userId: string;
  callbackUrl: string;
}

class VideoGenerationService {
  private runwayRecoveryTimer: NodeJS.Timeout | null = null;
  private waveSpeedRecoveryTimer: NodeJS.Timeout | null = null;

  private readonly primaryProviderFacade = new ProviderDispatchFacade(
    primaryProviderStrategies
  );

  private readonly fallbackProviderFacade = new ProviderDispatchFacade(
    fallbackProviderStrategies
  );

  // TTL cache prevents memory leaks - entries expire after 30 minutes
  private videoContextCache = new TTLCache<string, VideoContext>({
    maxSize: 500,
    ttlMs: 30 * 60 * 1000 // 30 minutes
  });

  constructor() {
    if (process.env.NODE_ENV !== "test") {
      this.startRunwayRecoveryLoop();
      this.startWaveSpeedRecoveryLoop();
    }
  }

  private getRunwayRecoveryIntervalMs(): number {
    return Number(process.env.RUNWAY_RECOVERY_INTERVAL_MS) || 15_000;
  }

  private getRunwayRecoveryAgeMs(): number {
    return Number(process.env.RUNWAY_RECOVERY_AGE_MS) || 30_000;
  }

  private getRunwayRecoveryBatchSize(): number {
    return Number(process.env.RUNWAY_RECOVERY_BATCH_SIZE) || 10;
  }

  private getWaveSpeedRecoveryIntervalMs(): number {
    return Number(process.env.WAVESPEED_RECOVERY_INTERVAL_MS) || 15_000;
  }

  private getWaveSpeedRecoveryAgeMs(): number {
    return Number(process.env.WAVESPEED_RECOVERY_AGE_MS) || 10 * 60_000;
  }

  private getWaveSpeedRecoveryBatchSize(): number {
    return Number(process.env.WAVESPEED_RECOVERY_BATCH_SIZE) || 25;
  }

  private startRunwayRecoveryLoop(): void {
    if (this.runwayRecoveryTimer) {
      return;
    }

    this.runwayRecoveryTimer = setInterval(() => {
      this.reconcileRecoverableRunwayJobs().catch((error) => {
        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          },
          "[VideoGenerationService] Runway recovery loop failed"
        );
      });
    }, this.getRunwayRecoveryIntervalMs());

    this.runwayRecoveryTimer.unref?.();
  }

  private startWaveSpeedRecoveryLoop(): void {
    if (this.waveSpeedRecoveryTimer) {
      return;
    }

    this.waveSpeedRecoveryTimer = setInterval(() => {
      this.reconcileRecoverableWaveSpeedJobs().catch((error) => {
        logger.error(
          {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          },
          "[VideoGenerationService] WaveSpeed recovery loop failed"
        );
      });
    }, this.getWaveSpeedRecoveryIntervalMs());

    this.waveSpeedRecoveryTimer.unref?.();
  }

  private async getVideoContext(videoId: string): Promise<VideoContext> {
    const cached = this.videoContextCache.get(videoId);
    if (cached) {
      return cached;
    }

    const record = await videoGenerationDb.getVideoContext(videoId);
    if (!record) {
      throw new Error(
        `Video context missing for video ${videoId} (ensure listing/user exists)`
      );
    }

    // callbackUrl is not stored in the DB. When cache is cold (e.g. after a
    // server restart or 30-min TTL expiry), return context with empty callbackUrl.
    // Webhook delivery will skip, but job completion and video upload continue.
    logger.warn(
      {
        videoId: record.videoId,
        listingId: record.listingId,
        userId: record.userId
      },
      "[VideoGenerationService] callbackUrl unavailable when rebuilding video context; webhook delivery may be skipped"
    );

    const context: VideoContext = {
      videoId: record.videoId,
      listingId: record.listingId,
      userId: record.userId,
      callbackUrl: ""
    };
    this.videoContextCache.set(videoId, context);
    return context;
  }

  // Build webhook callback URL with requestId for provider job correlation.
  private buildWebhookUrl(requestId: string): string {
    const baseWebhookUrl = process.env.FAL_WEBHOOK_URL || "";
    try {
      const url = new URL(baseWebhookUrl);
      url.searchParams.set("requestId", requestId);
      return url.toString();
    } catch {
      const separator = baseWebhookUrl.includes("?") ? "&" : "?";
      return `${baseWebhookUrl}${separator}requestId=${encodeURIComponent(requestId)}`;
    }
  }

  /**
   * Start video generation for multiple jobs
   * Phase 3 implementation:
   * - Read video_jobs from DB using jobIds
   * - Extract generationSettings from each job
   * - Dispatch to provider per job
   * - Update statuses to "processing" with timestamps
   */
  async startGeneration(
    request: VideoServerGenerateRequest
  ): Promise<GenerationResult> {
    // Seed the context cache with the per-request callbackUrl so webhook
    // delivery uses the caller's URL.
    this.videoContextCache.set(request.batchId, {
      videoId: request.batchId,
      listingId: request.listingId,
      userId: request.userId,
      callbackUrl: request.callbackUrl
    });

    return startGenerationOrchestrator(request, {
      findJobsByIds: videoGenerationDb.findJobsByIds,
      markVideoProcessing: videoGenerationDb.markVideoProcessing,
      markJobFailed: videoGenerationDb.markJobFailed,
      markVideoFailed: videoGenerationDb.markVideoFailed,
      dispatchJob: (job) => this.dispatchJob(job),
      runWithConcurrency: (items, limit, handler) =>
        runWithConcurrency(items, limit, handler)
    });
  }

  async cancelGenerationBatch(
    batchId: string,
    reason: string
  ): Promise<{ canceledBatches: number; canceledJobs: number }> {
    return cancelBatchGenerationOrchestrator(batchId, reason, {
      findCancelableJobsByBatchId: videoGenerationDb.findCancelableJobsByBatchId,
      cancelProviderTask: (taskId) => runwayService.cancelTask(taskId),
      releaseProviderTask: (provider, taskId) => {
        if (provider === "runway") {
          runwayTaskSlots.releaseByTaskId(taskId);
        }
        if (provider === "wavespeed") {
          waveSpeedTaskSlots.releaseByTaskId(taskId);
        }
      },
      markBatchCanceled
    });
  }

  private async dispatchJob(job: DBVideoGenJob): Promise<void> {
    return dispatchJobOrchestrator(job, {
      primaryProviderFacade: this.primaryProviderFacade,
      fallbackProviderFacade: this.fallbackProviderFacade,
      prepareProviderSourceImages: async ({ input }) => {
        if (input.imageUrls.length === 0) {
          return input.imageUrls;
        }

        const context = await this.getVideoContext(job.videoGenBatchId);
        const targetSize = resolveProviderSourceImageSize({
          model: input.model,
          orientation: input.orientation
        });
        const preparedPrimaryImageUrl = await prepareProviderSourceImage({
          imageUrl: input.imageUrls[0],
          userId: context.userId,
          listingId: context.listingId,
          videoId: context.videoId,
          jobId: input.jobId,
          targetSize
        });

        return [preparedPrimaryImageUrl, ...input.imageUrls.slice(1)];
      },
      markJobProcessing: videoGenerationDb.markJobProcessing,
      onProviderOutputReady: (currentJob, outputUrl, metadata) =>
        this.handleProviderSuccess(currentJob, outputUrl, metadata),
      onProviderOutputFailure: (jobId, errorMessage) =>
        this.handleJobExecutionFailure(jobId, errorMessage),
      buildWebhookUrl: (jobId) => this.buildWebhookUrl(jobId),
      getJobDurationSeconds: (currentJob) =>
        this.getJobDurationSeconds(currentJob)
    });
  }

  private getJobDurationSeconds(job: DBVideoGenJob): number {
    return job.metadata?.duration ?? 4;
  }

  private async handleJobExecutionFailure(
    jobId: string,
    errorMessage: string
  ): Promise<void> {
    const job = await videoGenerationDb.findJobById(jobId);

    if (
      !job ||
      job.status === "completed" ||
      job.status === "failed" ||
      job.status === "canceled"
    ) {
      return;
    }

    await handleJobExecutionFailureOrchestrator(job, errorMessage, {
      markJobFailed: videoGenerationDb.markJobFailed,
      markVideoFailed: videoGenerationDb.markVideoFailed,
      sendJobFailureWebhook: (
        job,
        currentErrorMessage,
        errorType,
        errorRetryable
      ) =>
        this.sendJobFailureWebhook(
          job,
          currentErrorMessage,
          errorType,
          errorRetryable
        )
    });
  }

  private async handleProviderSuccess(
    job: DBVideoGenJob,
    sourceUrl: string,
    metadata: {
      durationSeconds?: number;
      expectedFileSize?: number;
      thumbnailUrl?: string | null;
    }
  ): Promise<void> {
    const latestJob = await videoGenerationDb.findJobById(job.id);
    if (
      !latestJob ||
      latestJob.status === "completed" ||
      latestJob.status === "failed" ||
      latestJob.status === "canceled"
    ) {
      logger.info(
        { jobId: job.id, status: latestJob?.status ?? null },
        "[VideoGenerationService] Skipping provider success for terminal job"
      );
      return;
    }

    return handleProviderSuccessOrchestrator(latestJob, sourceUrl, metadata, {
      getVideoContext: (videoId) => this.getVideoContext(videoId),
      uploadFile: (options) => storageService.uploadFile(options),
      markJobCompleted: videoGenerationDb.markJobCompleted,
      sendJobCompletionWebhook: (currentJob, result) =>
        this.sendJobCompletionWebhook(currentJob, result),
      evaluateJobCompletion: (videoId) => this.evaluateJobCompletion(videoId),
      markVideoCompleted: videoGenerationDb.markVideoCompleted,
      getJobDurationSeconds: (currentJob) =>
        this.getJobDurationSeconds(currentJob)
    });
  }

  async reconcileRecoverableRunwayJobs(): Promise<void> {
    const cutoff = new Date(Date.now() - this.getRunwayRecoveryAgeMs());
    const jobs = await videoGenerationDb.findRecoverableRunwayJobs(
      cutoff,
      this.getRunwayRecoveryBatchSize()
    );

    for (const job of jobs) {
      const latestJob = await videoGenerationDb.findJobById(job.id);
      if (
        !latestJob ||
        latestJob.status !== "processing" ||
        !latestJob.requestId
      ) {
        continue;
      }

      const result = await reconcileRunwayJobOrchestrator(latestJob, {
        retrieveTask: (taskId) => runwayService.retrieveTask(taskId),
        handleProviderSuccess: (currentJob, outputUrl, metadata) =>
          this.handleProviderSuccess(currentJob, outputUrl, metadata),
        markJobFailed: videoGenerationDb.markJobFailed,
        markVideoFailed: videoGenerationDb.markVideoFailed,
        sendJobFailureWebhook: (currentJob, errorMessage, errorType, errorRetryable) =>
          this.sendJobFailureWebhook(
            currentJob,
            errorMessage,
            errorType,
            errorRetryable
          ),
        getJobDurationSeconds: (currentJob) =>
          this.getJobDurationSeconds(currentJob)
      });

      if (result.terminal) {
        runwayTaskSlots.releaseByTaskId(latestJob.requestId);
      }
    }
  }

  async reconcileRecoverableWaveSpeedJobs(): Promise<void> {
    const cutoff = new Date(Date.now() - this.getWaveSpeedRecoveryAgeMs());
    const jobs = await videoGenerationDb.findRecoverableWaveSpeedJobs(
      cutoff,
      this.getWaveSpeedRecoveryBatchSize()
    );

    for (const job of jobs) {
      const latestJob = await videoGenerationDb.findJobById(job.id);
      if (
        !latestJob ||
        latestJob.status !== "processing" ||
        !latestJob.requestId
      ) {
        continue;
      }

      const result = await reconcileWaveSpeedJobOrchestrator(latestJob, {
        retrieveTask: (taskId) => waveSpeedService.retrieveTask(taskId),
        handleProviderSuccess: (currentJob, outputUrl, metadata) =>
          this.handleProviderSuccess(currentJob, outputUrl, metadata),
        markJobFailed: videoGenerationDb.markJobFailed,
        markVideoFailed: videoGenerationDb.markVideoFailed,
        sendJobFailureWebhook: (currentJob, errorMessage, errorType, errorRetryable) =>
          this.sendJobFailureWebhook(
            currentJob,
            errorMessage,
            errorType,
            errorRetryable
          ),
        getJobDurationSeconds: (currentJob) =>
          this.getJobDurationSeconds(currentJob)
      });

      if (result.terminal) {
        waveSpeedTaskSlots.releaseByTaskId(latestJob.requestId);
      }
    }
  }

  /**
   * Handle provider webhook for job completion
   * Phase 3 implementation:
   * - Match webhook by requestId to video_jobs row
   * - Update job status (completed/failed)
   * - Propagate failures to parent video
   * - Add idempotency protection
   */
  async handleFalWebhook(
    payload: FalWebhookPayload,
    fallbackJobId?: string
  ): Promise<void> {
    return handleFalWebhookOrchestrator(payload, fallbackJobId, {
      findJobByRequestId: videoGenerationDb.findJobByRequestId,
      findJobById: videoGenerationDb.findJobById,
      attachRequestIdToJob: videoGenerationDb.attachRequestIdToJob,
      markJobFailed: videoGenerationDb.markJobFailed,
      markVideoFailed: videoGenerationDb.markVideoFailed,
      handleProviderSuccess: (job, sourceUrl, metadata) =>
        this.handleProviderSuccess(job, sourceUrl, metadata),
      sendJobFailureWebhook: (job, errorMessage, errorType, errorRetryable) =>
        this.sendJobFailureWebhook(
          job,
          errorMessage,
          errorType,
          errorRetryable
        ),
      getJobDurationSeconds: (job) => this.getJobDurationSeconds(job)
    });
  }

  async handleWaveSpeedWebhook(
    payload: WaveSpeedWebhookPayload,
    fallbackJobId?: string
  ): Promise<void> {
    const byRequestId = payload.id
      ? await videoGenerationDb.findJobByRequestId(payload.id)
      : null;
    const job =
      byRequestId ??
      (fallbackJobId ? await videoGenerationDb.findJobById(fallbackJobId) : null);

    if (!job) {
      return;
    }

    if (!job.requestId && payload.id) {
      await videoGenerationDb.attachRequestIdToJob(job.id, payload.id);
    }

    const latestJob = await videoGenerationDb.findJobById(job.id);
    if (
      !latestJob ||
      latestJob.status === "completed" ||
      latestJob.status === "failed" ||
      latestJob.status === "canceled"
    ) {
      return;
    }

    const requestId = payload.id || latestJob.requestId || undefined;

    if (payload.status === "completed") {
      const outputUrl = payload.outputs?.[0];
      if (!outputUrl) {
        await this.handleJobExecutionFailure(
          latestJob.id,
          "WaveSpeed task completed without an output URL"
        );
      } else {
        await this.handleProviderSuccess(latestJob, outputUrl, {
          durationSeconds: this.getJobDurationSeconds(latestJob),
          thumbnailUrl: null
        });
      }
    } else if (payload.status === "failed") {
      await this.handleJobExecutionFailure(
        latestJob.id,
        payload.error || "WaveSpeed task failed"
      );
    }

    if (requestId) {
      waveSpeedTaskSlots.releaseByTaskId(requestId);
    }
  }

  /**
   * Send webhook notification to Vercel app for job completion
   * Includes retry logic and delivery tracking
   */
  private async sendJobCompletionWebhook(
    job: DBVideoGenJob,
    result: VideoJobResult
  ): Promise<void> {
    try {
      await sendJobCompletionWebhookOrchestrator(job, result, {
        getVideoContext: async (videoId) => this.getVideoContext(videoId),
        sendWebhook: (options) => webhookService.sendWebhook(options)
      });
    } catch (error) {
      logger.error(
        {
          jobId: job.id,
          videoId: job.videoGenBatchId,
          error: error instanceof Error ? error.message : String(error)
        },
        "[VideoGenerationService] Cannot send webhook: parent video not found"
      );
    }
  }

  /**
   * Send webhook notification for job failure
   */
  private async sendJobFailureWebhook(
    job: DBVideoGenJob,
    errorMessage: string,
    errorType: string,
    errorRetryable: boolean
  ): Promise<void> {
    try {
      await sendJobFailureWebhookOrchestrator(
        job,
        errorMessage,
        errorType,
        errorRetryable,
        {
          getVideoContext: async (videoId) => this.getVideoContext(videoId),
          sendWebhook: (options) => webhookService.sendWebhook(options)
        }
      );
    } catch (error) {
      logger.error(
        {
          jobId: job.id,
          videoId: job.videoGenBatchId,
          error: error instanceof Error ? error.message : String(error)
        },
        "[VideoGenerationService] Cannot send failure webhook: missing video context"
      );
    }
  }

  private async evaluateJobCompletion(videoId: string): Promise<{
    allCompleted: boolean;
    completedJobs: DBVideoGenJob[];
    failedJobs: number;
  }> {
    return evaluateJobCompletionOrchestrator(videoId, {
      findJobsByVideoId: videoGenerationDb.findJobsByVideoId,
      markVideoFailed: videoGenerationDb.markVideoFailed
    });
  }
}

export const videoGenerationService = new VideoGenerationService();
