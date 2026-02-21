/**
 * Video Generation Service
 * Handles the job-based video generation workflow
 * Reads video_gen_jobs from DB, dispatches to provider strategies,
 * and manages state transitions
 */

import logger from "@/config/logger";
import type {
  VideoServerGenerateRequest,
  FalWebhookPayload,
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
import { videoGenerationDb } from "@/services/videoGeneration/adapters/db";
import { ProviderDispatchFacade } from "@/services/videoGeneration/facades/providerFacade";
import {
  fallbackProviderStrategies,
  primaryProviderStrategies
} from "@/services/videoGeneration/strategies";
import { storageService } from "@/services/storage";
import { webhookService } from "@/services/webhook";
import { runWithConcurrency } from "@/services/videoGeneration/domain/concurrency";

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
    this.videoContextCache.set(request.videoId, {
      videoId: request.videoId,
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

  private async dispatchJob(job: DBVideoGenJob): Promise<void> {
    return dispatchJobOrchestrator(job, {
      primaryProviderFacade: this.primaryProviderFacade,
      fallbackProviderFacade: this.fallbackProviderFacade,
      markJobProcessing: videoGenerationDb.markJobProcessing,
      onProviderOutputReady: (currentJob, outputUrl, metadata) =>
        this.handleProviderSuccess(currentJob, outputUrl, metadata),
      onProviderOutputFailure: (jobId, errorMessage) =>
        this.handleProviderDispatchFailure(jobId, errorMessage),
      buildWebhookUrl: (jobId) => this.buildWebhookUrl(jobId),
      getJobDurationSeconds: (currentJob) =>
        this.getJobDurationSeconds(currentJob)
    });
  }

  private getJobDurationSeconds(job: DBVideoGenJob): number {
    return job.metadata?.duration ?? 4;
  }

  private async handleProviderDispatchFailure(
    jobId: string,
    errorMessage: string
  ): Promise<void> {
    const job = await videoGenerationDb.findJobById(jobId);

    if (!job || job.status === "completed" || job.status === "canceled") {
      return;
    }

    try {
      await dispatchJobOrchestrator(job, {
        primaryProviderFacade: this.fallbackProviderFacade,
        fallbackProviderFacade: this.fallbackProviderFacade,
        markJobProcessing: videoGenerationDb.markJobProcessing,
        onProviderOutputReady: (currentJob, outputUrl, metadata) =>
          this.handleProviderSuccess(currentJob, outputUrl, metadata),
        onProviderOutputFailure: (currentJobId, providerErrorMessage) =>
          this.handleProviderDispatchFailure(
            currentJobId,
            providerErrorMessage
          ),
        buildWebhookUrl: (jobIdValue) => this.buildWebhookUrl(jobIdValue),
        getJobDurationSeconds: (currentJob) =>
          this.getJobDurationSeconds(currentJob)
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Provider fallback failed";
      await videoGenerationDb.markJobFailed(
        jobId,
        `${errorMessage}. ${message}`
      );
      await videoGenerationDb.markVideoFailed(
        job.videoGenBatchId,
        `Job ${job.id} failed: ${errorMessage}. ${message}`
      );

      await this.sendJobFailureWebhook(
        job,
        `${errorMessage}. ${message}`,
        "PROVIDER_ERROR",
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
    return handleProviderSuccessOrchestrator(job, sourceUrl, metadata, {
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
