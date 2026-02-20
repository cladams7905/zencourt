/**
 * Video Generation Service
 * Handles the job-based video generation workflow
 * Reads video_gen_jobs from DB, dispatches to Runway (default) with Kling fallback,
 * and manages state transitions
 */

import logger from "@/config/logger";
import { storageService } from "./storageService";
import { webhookService } from "./webhookService";
import type {
  VideoServerGenerateRequest,
  FalWebhookPayload,
  VideoJobResult,
  VideoJobWebhookPayload
} from "@shared/types/api";
import type { DBVideoGenJob } from "@shared/types/models";
import {
  getVideoJobThumbnailPath,
  getVideoJobVideoPath
} from "@shared/utils/storagePaths";
import { TTLCache } from "@/lib/utils/cache";
import {
  downloadVideoBufferWithRetry,
  downloadImageBufferWithRetry
} from "@/lib/utils/downloadWithRetry";
import { filterAndSortCompletedJobs } from "@/lib/utils/compositionHelpers";
import { startGenerationOrchestrator } from "@/services/videoGeneration/orchestrators/startGeneration";
import { handleFalWebhookOrchestrator } from "@/services/videoGeneration/orchestrators/handleFalWebhook";
import { videoGenerationDb } from "@/services/videoGeneration/adapters/db";
import { ProviderDispatchFacade } from "@/services/videoGeneration/facades/providerFacade";
import { runwayStrategy } from "@/services/videoGeneration/providers/runwayStrategy";
import { klingStrategy } from "@/services/videoGeneration/providers/klingStrategy";

interface GenerationResult {
  jobsStarted: number;
  failedJobs: string[];
}

interface VideoContext {
  videoId: string;
  listingId: string;
  userId: string;
}

class VideoGenerationService {
  private readonly primaryProviderFacade = new ProviderDispatchFacade([
    runwayStrategy,
    klingStrategy
  ]);

  private readonly fallbackProviderFacade = new ProviderDispatchFacade([
    klingStrategy
  ]);

  // TTL cache prevents memory leaks - entries expire after 30 minutes
  private videoContextCache = new TTLCache<string, VideoContext>({
    maxSize: 500,
    ttlMs: 30 * 60 * 1000 // 30 minutes
  });

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

    const context: VideoContext = {
      videoId: record.videoId,
      listingId: record.listingId,
      userId: record.userId
    };

    this.videoContextCache.set(videoId, context);
    return context;
  }

  /**
   * Build webhook URL for Kling (Fal) callback
   * Uses requestId instead of videoId for proper job matching
   */
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
    return startGenerationOrchestrator(request, {
      findJobsByIds: videoGenerationDb.findJobsByIds,
      markVideoProcessing: videoGenerationDb.markVideoProcessing,
      markJobFailed: videoGenerationDb.markJobFailed,
      markVideoFailed: videoGenerationDb.markVideoFailed,
      dispatchJob: (job) => this.dispatchJob(job),
      runWithConcurrency: (items, limit, handler) =>
        this.runWithConcurrency(items, limit, handler)
    });
  }

  /**
   * Dispatch a single job to Runway (default) with Kling fallback on failure
   */
  private async dispatchJob(job: DBVideoGenJob): Promise<void> {
    const settings = job.generationSettings;
    if (!settings) {
      throw new Error(`Job ${job.id} missing generationSettings`);
    }

    const { imageUrls, prompt } = settings;
    const orientation = settings.orientation ?? "vertical";
    if (!imageUrls || imageUrls.length === 0) {
      throw new Error(`Job ${job.id} missing imageUrls in generationSettings`);
    }
    if (!prompt) {
      throw new Error(`Job ${job.id} missing prompt in generationSettings`);
    }

    const durationSeconds = this.getJobDurationSeconds(job);

    try {
      const providerResult = await this.primaryProviderFacade.dispatch({
        jobId: job.id,
        videoId: job.videoGenBatchId,
        prompt,
        imageUrls,
        orientation,
        durationSeconds,
        webhookUrl: this.buildWebhookUrl(job.id)
      });

      logger.info(
        {
          jobId: job.id,
          requestId: providerResult.requestId,
          provider: providerResult.provider
        },
        "[VideoGenerationService] Provider job submitted"
      );

      await videoGenerationDb.markJobProcessing(job.id, providerResult.requestId, {
        ...settings,
        model: providerResult.model
      });

      providerResult
        .waitForOutput?.()
        .then((result) => {
          return this.handleProviderSuccess(job, result.outputUrl, {
            durationSeconds: 4,
            thumbnailUrl: null
          });
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : "Provider task failed";
          this.handleRunwayFailure(job.id, message).catch((innerError) => {
            logger.error(
              {
                jobId: job.id,
                requestId: providerResult.requestId,
                error:
                  innerError instanceof Error
                    ? innerError.message
                    : String(innerError)
              },
              "[VideoGenerationService] Provider fallback failed"
            );
          });
        });

      return;
    } catch (error) {
      logger.warn(
        {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error)
        },
        "[VideoGenerationService] Provider dispatch failed"
      );
      throw error;
    }
  }

  private async dispatchJobToKling(job: DBVideoGenJob): Promise<void> {
    const settings = job.generationSettings;
    if (!settings) {
      throw new Error(`Job ${job.id} missing generationSettings`);
    }

    const { imageUrls, prompt } = settings;
    const orientation = settings.orientation ?? "vertical";
    const durationSeconds = this.getJobDurationSeconds(job);
    const result = await this.fallbackProviderFacade.dispatch({
      jobId: job.id,
      videoId: job.videoGenBatchId,
      prompt,
      imageUrls,
      orientation,
      durationSeconds,
      webhookUrl: this.buildWebhookUrl(job.id)
    });

    await videoGenerationDb.markJobProcessing(job.id, result.requestId, {
      ...settings,
      model: result.model
    });

    logger.info(
      {
        jobId: job.id,
        videoId: job.videoGenBatchId,
        requestId: result.requestId
      },
      "[VideoGenerationService] Job marked as processing (provider fallback)"
    );
  }

  private getJobDurationSeconds(job: DBVideoGenJob): number {
    return job.metadata?.duration ?? 4;
  }

  private async runWithConcurrency<T>(
    items: T[],
    limit: number,
    handler: (item: T) => Promise<void>
  ): Promise<void> {
    if (items.length === 0) {
      return;
    }
    const max = Math.max(1, limit);
    let index = 0;
    const workers = Array.from({ length: Math.min(max, items.length) }).map(
      async () => {
        while (index < items.length) {
          const current = items[index];
          index += 1;
          await handler(current);
        }
      }
    );

    await Promise.all(workers);
  }

  private async handleRunwayFailure(
    jobId: string,
    errorMessage: string
  ): Promise<void> {
    const job = await videoGenerationDb.findJobById(jobId);

    if (!job || job.status === "completed" || job.status === "canceled") {
      return;
    }

    if (job.generationSettings?.model === "kling1.6") {
      return;
    }

    try {
      await this.dispatchJobToKling(job);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Kling fallback failed";
      await videoGenerationDb.markJobFailed(jobId, `${errorMessage}. ${message}`);
      await videoGenerationDb.markVideoFailed(
        job.videoGenBatchId,
        `Job ${job.id} failed: ${errorMessage}. ${message}`
      );

      await this.sendJobFailureWebhook(
        job,
        `${errorMessage}. ${message}`,
        "RUNWAY_ERROR",
        false
      );
    }
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
    const videoContext = await this.getVideoContext(job.videoGenBatchId);
    const videoKey = getVideoJobVideoPath(
      videoContext.userId,
      videoContext.listingId,
      job.videoGenBatchId,
      job.id
    );

    const { buffer: videoBuffer, checksumSha256 } =
      await downloadVideoBufferWithRetry(sourceUrl, {
        expectedSize: metadata.expectedFileSize
      });

    let thumbnailBuffer: Buffer | null = null;
    if (metadata.thumbnailUrl) {
      try {
        thumbnailBuffer = await downloadImageBufferWithRetry(
          metadata.thumbnailUrl
        );
      } catch (error) {
        logger.warn(
          {
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error)
          },
          "[VideoGenerationService] Failed to download provider thumbnail"
        );
      }
    }

    if (!thumbnailBuffer) {
      const listingImageUrl = job.generationSettings?.imageUrls?.[0];
      if (listingImageUrl) {
        try {
          thumbnailBuffer = await downloadImageBufferWithRetry(listingImageUrl);
        } catch (error) {
          logger.warn(
            {
              jobId: job.id,
              error: error instanceof Error ? error.message : String(error)
            },
            "[VideoGenerationService] Failed to download listing image for thumbnail"
          );
        }
      }
    }

    const videoUrl = await storageService.uploadFile({
      key: videoKey,
      body: videoBuffer,
      contentType: "video/mp4",
      metadata: {
        jobId: job.id,
        videoId: job.videoGenBatchId,
        listingId: videoContext.listingId,
        userId: videoContext.userId,
        generationModel: job.generationSettings?.model || "veo3.1_fast"
      }
    });

    let thumbnailUrl: string | null = null;
    if (thumbnailBuffer) {
      const thumbnailKey = getVideoJobThumbnailPath(
        videoContext.userId,
        videoContext.listingId,
        job.videoGenBatchId,
        job.id
      );
      thumbnailUrl = await storageService.uploadFile({
        key: thumbnailKey,
        body: thumbnailBuffer,
        contentType: "image/jpeg",
        metadata: {
          jobId: job.id,
          videoId: job.videoGenBatchId,
          listingId: videoContext.listingId,
          userId: videoContext.userId
        }
      });
    }

    await videoGenerationDb.markJobCompleted(job.id, {
      videoUrl,
      thumbnailUrl,
      metadata: {
        ...job.metadata,
        duration: metadata.durationSeconds,
        fileSize: videoBuffer.length,
        checksumSha256,
        orientation: job.generationSettings?.orientation || "vertical"
      }
    });

    await this.sendJobCompletionWebhook(job, {
      videoUrl,
      thumbnailUrl: thumbnailUrl ?? undefined,
      duration:
        metadata.durationSeconds ?? this.getJobDurationSeconds(job) ?? 0,
      fileSize: videoBuffer.length
    });

    const completionStatus = await this.evaluateJobCompletion(
      job.videoGenBatchId
    );

    if (completionStatus.allCompleted) {
      const failedCount = completionStatus.failedJobs;
      await videoGenerationDb.markVideoCompleted(
        job.videoGenBatchId,
        failedCount > 0
          ? `${failedCount} clip${failedCount === 1 ? "" : "s"} failed`
          : null
      );
    }
  }

  /**
   * Handle Kling (Fal) webhook for job completion
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
        this.sendJobFailureWebhook(job, errorMessage, errorType, errorRetryable),
      getJobDurationSeconds: (job) => this.getJobDurationSeconds(job)
    });
  }

  /**
   * Send webhook notification to Vercel app for job completion
   * Includes retry logic and delivery tracking
   */
  private async sendJobCompletionWebhook(
    job: DBVideoGenJob,
    result: VideoJobResult
  ): Promise<void> {
    const videoContext = await this.getVideoContext(job.videoGenBatchId);

    if (!videoContext) {
      logger.error(
        { jobId: job.id, videoId: job.videoGenBatchId },
        "[VideoGenerationService] Cannot send webhook: parent video not found"
      );
      return;
    }

    // Build webhook URL from Vercel API URL
    const webhookUrl = `${process.env.VERCEL_API_URL}/api/v1/webhooks/video`;
    const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn(
        { jobId: job.id },
        "[VideoGenerationService] VERCEL_WEBHOOK_SECRET not configured, skipping webhook delivery"
      );
      return;
    }

    const payload: VideoJobWebhookPayload = {
      jobId: job.id,
      listingId: videoContext.listingId,
      status: "completed",
      timestamp: new Date().toISOString(),
      result
    };

    try {
      await webhookService.sendWebhook({
        url: webhookUrl,
        secret: webhookSecret,
        payload: payload,
        maxRetries: 5,
        backoffMs: 1000
      });

      logger.info(
        { jobId: job.id, listingId: videoContext.listingId },
        "[VideoGenerationService] Webhook delivered successfully"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to deliver webhook";

      logger.error(
        {
          jobId: job.id,
          listingId: videoContext.listingId,
          error: errorMessage
        },
        "[VideoGenerationService] Webhook delivery failed"
      );

      // Don't throw - webhook failures shouldn't fail the job
      // The job is already marked as completed with the video URLs
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
    let videoContext: VideoContext;
    try {
      videoContext = await this.getVideoContext(job.videoGenBatchId);
    } catch (error) {
      logger.error(
        {
          jobId: job.id,
          videoId: job.videoGenBatchId,
          error: error instanceof Error ? error.message : String(error)
        },
        "[VideoGenerationService] Cannot send failure webhook: missing video context"
      );
      return;
    }

    // Build webhook URL from Vercel API URL
    const webhookUrl = `${process.env.VERCEL_API_URL}/api/v1/webhooks/video`;
    const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET;

    if (!webhookUrl || !webhookSecret) {
      return;
    }

    const payload: VideoJobWebhookPayload = {
      jobId: job.id,
      listingId: videoContext.listingId,
      status: "failed",
      timestamp: new Date().toISOString(),
      error: {
        message: errorMessage,
        code: "",
        type: errorType,
        retryable: errorRetryable
      }
    };

    try {
      await webhookService.sendWebhook({
        url: webhookUrl,
        secret: webhookSecret,
        payload: payload,
        maxRetries: 3, // Fewer retries for failure notifications
        backoffMs: 1000
      });

      logger.info(
        { jobId: job.id, listingId: videoContext.listingId },
        "[VideoGenerationService] Failure webhook delivered"
      );
    } catch (error) {
      logger.error(
        {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error)
        },
        "[VideoGenerationService] Failed to deliver failure webhook"
      );
      // Silently fail - don't want webhook failures to cascade
    }
  }

  private async evaluateJobCompletion(videoId: string): Promise<{
    allCompleted: boolean;
    completedJobs: DBVideoGenJob[];
    failedJobs: number;
  }> {
    const jobs = await videoGenerationDb.findJobsByVideoId(videoId);

    if (jobs.length === 0) {
      return { allCompleted: false, completedJobs: [], failedJobs: 0 };
    }

    const completedJobs = filterAndSortCompletedJobs(jobs);
    const failedJobs = jobs.filter((job) => job.status === "failed").length;

    const allDone = jobs.every(
      (job) => job.status === "completed" || job.status === "failed"
    );
    const allFailed = jobs.every((job) => job.status === "failed");

    if (allFailed) {
      logger.error(
        { videoId, jobCount: jobs.length },
        "[VideoGenerationService] All jobs failed, cannot compose video"
      );

      await videoGenerationDb.markVideoFailed(videoId, "All video jobs failed");

      return { allCompleted: false, completedJobs: [], failedJobs };
    }

    if (!allDone || completedJobs.length === 0) {
      return { allCompleted: false, completedJobs, failedJobs };
    }

    return { allCompleted: true, completedJobs, failedJobs };
  }
}

export const videoGenerationService = new VideoGenerationService();
