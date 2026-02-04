/**
 * Video Generation Service
 * Handles the job-based video generation workflow
 * Reads video_content_jobs from DB, dispatches to Runway (default) with Kling fallback,
 * and manages state transitions
 */

import logger from "@/config/logger";
import { klingService } from "./klingService";
import { runwayService } from "./runwayService";
import { storageService } from "./storageService";
import { webhookService } from "./webhookService";
import { remotionRenderQueue, type RenderJobData } from "./remotionRenderQueue";
import { remotionRenderService } from "./remotionRenderService";
import {
  db,
  videoContentJobs as videoJobs,
  videoContent as videos,
  content,
  listings,
  eq,
  inArray
} from "@db/client";
import type {
  VideoServerGenerateRequest,
  FalWebhookPayload,
  VideoJobResult,
  VideoJobWebhookPayload
} from "@shared/types/api";
import type { DBVideoContentJob } from "@shared/types/models";
import type { ComposedVideoResult } from "@shared/types/video/composition";
import {
  getFinalVideoPath,
  getThumbnailPath,
  getVideoJobThumbnailPath,
  getVideoJobVideoPath
} from "@shared/utils/storagePaths";
import { TTLCache } from "@/utils/cache";
import {
  downloadVideoBufferWithRetry,
  downloadImageBufferWithRetry
} from "@/utils/downloadWithRetry";
import {
  filterAndSortCompletedJobs,
  buildClipsFromJobs,
  getOrientationFromJobs
} from "@/utils/compositionHelpers";
import {
  createRenderJobRecord,
  markRenderJobProcessing,
  updateRenderJobProgress,
  markRenderJobCompleted,
  markRenderJobFailed
} from "@/utils/dbHelpers";

interface GenerationResult {
  jobsStarted: number;
  failedJobs: string[];
}

interface VideoContext {
  videoId: string;
  contentId: string;
  listingId: string;
  userId: string;
}

class VideoGenerationService {
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

    const [record] = await db
      .select({
        videoId: videos.id,
        contentId: videos.contentId,
        listingId: content.listingId,
        userId: listings.userId
      })
      .from(videos)
      .innerJoin(content, eq(videos.contentId, content.id))
      .innerJoin(listings, eq(content.listingId, listings.id))
      .where(eq(videos.id, videoId))
      .limit(1);

    if (
      !record?.videoId ||
      !record?.contentId ||
      !record?.listingId ||
      !record?.userId
    ) {
      throw new Error(
        `Video context missing for video ${videoId} (ensure listing/user exists)`
      );
    }

    const context: VideoContext = {
      videoId: record.videoId,
      contentId: record.contentId,
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
    try {
      const url = new URL(process.env.FAL_WEBHOOK_URL);
      url.searchParams.set("requestId", requestId);
      return url.toString();
    } catch {
      const separator = process.env.FAL_WEBHOOK_URL.includes("?") ? "&" : "?";
      return `${
        process.env.FAL_WEBHOOK_URL
      }${separator}requestId=${encodeURIComponent(requestId)}`;
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
    const { videoId, jobIds, listingId, userId } = request;

    logger.info(
      {
        videoId,
        listingId,
        userId,
        jobCount: jobIds.length,
        jobIds
      },
      "[VideoGenerationService] Starting generation for jobs"
    );

    // Step 1: Read video_jobs from database
    const jobs = await db
      .select()
      .from(videoJobs)
      .where(inArray(videoJobs.id, jobIds));

    if (jobs.length === 0) {
      throw new Error(`No video jobs found for jobIds: ${jobIds.join(", ")}`);
    }

    if (jobs.length !== jobIds.length) {
      logger.warn(
        {
          requested: jobIds.length,
          found: jobs.length,
          jobIds
        },
        "[VideoGenerationService] Some jobs not found in database"
      );
    }

    // Validate all jobs belong to the same video
    const invalidJobs = jobs.filter((job) => job.videoContentId !== videoId);
    if (invalidJobs.length > 0) {
      throw new Error(
        `Jobs do not belong to video ${videoId}: ${invalidJobs
          .map((j) => j.id)
          .join(", ")}`
      );
    }

    // Step 2: Update parent video status to "processing"
    await db
      .update(videos)
      .set({
        status: "processing",
        updatedAt: new Date()
      })
      .where(eq(videos.id, videoId));

    logger.info(
      { videoId },
      "[VideoGenerationService] Marked parent video as processing"
    );

    // Step 3: Dispatch each job to the generation provider
    const failedJobs: string[] = [];
    let successCount = 0;
    const concurrency = Number(process.env.GENERATION_CONCURRENCY) || 3;

    await this.runWithConcurrency(jobs, concurrency, async (job) => {
      try {
        await this.dispatchJob(job);
        successCount += 1;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to dispatch job to provider";

        logger.error(
          {
            jobId: job.id,
            videoId,
            error: errorMessage
          },
          "[VideoGenerationService] Failed to dispatch job"
        );

        failedJobs.push(job.id);

        await db
          .update(videoJobs)
          .set({
            status: "failed",
            errorMessage,
            errorType: "DISPATCH_ERROR",
            errorRetryable: true,
            updatedAt: new Date()
          })
          .where(eq(videoJobs.id, job.id));
      }
    });

    // If all jobs failed, mark parent video as failed
    if (successCount === 0) {
      await db
        .update(videos)
        .set({
          status: "failed",
          errorMessage: "All video jobs failed to dispatch",
          updatedAt: new Date()
        })
        .where(eq(videos.id, videoId));

      throw new Error("All video jobs failed to dispatch");
    }

    logger.info(
      {
        videoId,
        totalJobs: jobs.length,
        successCount,
        failedCount: failedJobs.length
      },
      "[VideoGenerationService] Generation dispatch completed"
    );

    return {
      jobsStarted: successCount,
      failedJobs
    };
  }

  /**
   * Dispatch a single job to Runway (default) with Kling fallback on failure
   */
  private async dispatchJob(job: DBVideoContentJob): Promise<void> {
    const settings = job.generationSettings;
    if (!settings) {
      throw new Error(`Job ${job.id} missing generationSettings`);
    }

    const { imageUrls, prompt, orientation } = settings;
    if (!imageUrls || imageUrls.length === 0) {
      throw new Error(`Job ${job.id} missing imageUrls in generationSettings`);
    }
    if (!prompt) {
      throw new Error(`Job ${job.id} missing prompt in generationSettings`);
    }

    const durationSeconds = this.getJobDurationSeconds(job);
    // Gen4 turbo ratio format (different from gen3a)
    const runwayRatio = orientation === "vertical" ? "720:1280" : "1280:720";

    try {
      const task = await runwayService.submitImageToVideo({
        promptImage: imageUrls[0],
        promptText: prompt,
        ratio: runwayRatio,
        duration: durationSeconds
      });

      logger.info(
        { jobId: job.id, requestId: task.id },
        "[VideoGenerationService] Runway job submitted"
      );

      await db
        .update(videoJobs)
        .set({
          requestId: task.id,
          status: "processing",
          processingStartedAt: new Date(),
          updatedAt: new Date(),
          generationModel: "runway-gen4-turbo"
        })
        .where(eq(videoJobs.id, job.id));

      task
        .waitForTaskOutput()
        .then((result) => {
          const output = result?.output?.[0];
          const outputUrl = output?.uri;
          if (!outputUrl) {
            throw new Error("Runway task missing output URL");
          }
          // Runway doesn't provide thumbnails, so we'll generate one later
          return this.handleProviderSuccess(job, outputUrl, {
            durationSeconds,
            thumbnailUrl: null
          });
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : "Runway task failed";
          this.handleRunwayFailure(job.id, message).catch((innerError) => {
            logger.error(
              {
                jobId: job.id,
                requestId: task.id,
                error:
                  innerError instanceof Error
                    ? innerError.message
                    : String(innerError)
              },
              "[VideoGenerationService] Runway fallback failed"
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
        "[VideoGenerationService] Runway dispatch failed, falling back to Kling"
      );
    }

    await this.dispatchJobToKling(job);
  }

  private async dispatchJobToKling(job: DBVideoContentJob): Promise<void> {
    const settings = job.generationSettings;
    if (!settings) {
      throw new Error(`Job ${job.id} missing generationSettings`);
    }

    const { imageUrls, prompt, orientation } = settings;
    const durationSeconds = this.getJobDurationSeconds(job);
    const aspectRatio = orientation === "vertical" ? "9:16" : "16:9";

    logger.info(
      {
        jobId: job.id,
        videoId: job.videoContentId,
        imageCount: imageUrls.length,
        aspectRatio
      },
      "[VideoGenerationService] Dispatching job to Kling (Fal)"
    );

    // Kling expects duration as "5" | "10"
    const klingDuration = (durationSeconds === 10 ? "10" : "5") as "5" | "10";

    const requestId = await klingService.submitRoomVideo({
      prompt,
      imageUrls,
      duration: klingDuration,
      aspectRatio,
      webhookUrl: this.buildWebhookUrl(job.id)
    });

    await db
      .update(videoJobs)
      .set({
        requestId,
        status: "processing",
        processingStartedAt: new Date(),
        updatedAt: new Date(),
        generationModel: "kling1.6"
      })
      .where(eq(videoJobs.id, job.id));

    logger.info(
      {
        jobId: job.id,
        videoId: job.videoContentId,
        requestId
      },
      "[VideoGenerationService] Job marked as processing (Kling fallback)"
    );
  }

  private getJobDurationSeconds(job: DBVideoContentJob): number {
    return job.generationSettings?.durationSeconds ?? 5;
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
    const job = await db
      .select()
      .from(videoJobs)
      .where(eq(videoJobs.id, jobId))
      .limit(1)
      .then((rows) => rows[0] || null);

    if (!job || job.status === "completed" || job.status === "canceled") {
      return;
    }

    if (job.generationModel === "kling1.6") {
      return;
    }

    try {
      await this.dispatchJobToKling(job);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Kling fallback failed";
      await db
        .update(videoJobs)
        .set({
          status: "failed",
          errorMessage: `${errorMessage}. ${message}`,
          errorType: "RUNWAY_ERROR",
          errorRetryable: false,
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, jobId));

      await db
        .update(videos)
        .set({
          status: "failed",
          errorMessage: `Job ${job.id} failed: ${errorMessage}. ${message}`,
          updatedAt: new Date()
        })
        .where(eq(videos.id, job.videoContentId));

      await this.sendJobFailureWebhook(
        job,
        `${errorMessage}. ${message}`,
        "RUNWAY_ERROR",
        false
      );
    }
  }

  private async handleProviderSuccess(
    job: DBVideoContentJob,
    sourceUrl: string,
    metadata: {
      durationSeconds?: number;
      expectedFileSize?: number;
      thumbnailUrl?: string | null;
    }
  ): Promise<void> {
    const videoContext = await this.getVideoContext(job.videoContentId);
    const videoKey = getVideoJobVideoPath(
      videoContext.userId,
      videoContext.listingId,
      job.videoContentId,
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
      try {
        thumbnailBuffer = await remotionRenderService.renderThumbnailFromVideo({
          videoUrl: sourceUrl,
          orientation: job.generationSettings?.orientation || "vertical",
          videoId: job.videoContentId,
          jobId: job.id
        });
      } catch (error) {
        logger.warn(
          {
            jobId: job.id,
            error: error instanceof Error ? error.message : String(error)
          },
          "[VideoGenerationService] Failed to render thumbnail"
        );
      }
    }

    const videoUrl = await storageService.uploadFile({
      key: videoKey,
      body: videoBuffer,
      contentType: "video/mp4",
      metadata: {
        jobId: job.id,
        videoId: job.videoContentId,
        listingId: videoContext.listingId,
        userId: videoContext.userId,
        generationModel: job.generationModel || "runway-gen4-turbo"
      }
    });

    let thumbnailUrl: string | null = null;
    if (thumbnailBuffer) {
      const thumbnailKey = getVideoJobThumbnailPath(
        videoContext.userId,
        videoContext.listingId,
        job.videoContentId,
        job.id
      );
      thumbnailUrl = await storageService.uploadFile({
        key: thumbnailKey,
        body: thumbnailBuffer,
        contentType: "image/jpeg",
        metadata: {
          jobId: job.id,
          videoId: job.videoContentId,
          listingId: videoContext.listingId,
          userId: videoContext.userId
        }
      });
    }

    await db
      .update(videoJobs)
      .set({
        status: "completed",
        videoUrl,
        thumbnailUrl,
        metadata: {
          ...job.metadata,
          duration: metadata.durationSeconds,
          fileSize: videoBuffer.length,
          checksumSha256,
          orientation: job.generationSettings?.orientation || "vertical"
        },
        processingCompletedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(videoJobs.id, job.id));

    await this.sendJobCompletionWebhook(job, {
      videoUrl,
      thumbnailUrl: thumbnailUrl ?? undefined,
      duration:
        metadata.durationSeconds ?? this.getJobDurationSeconds(job) ?? 0,
      fileSize: videoBuffer.length
    });

    const completionStatus = await this.evaluateJobCompletion(
      job.videoContentId
    );

    if (completionStatus.allCompleted) {
      this.composeAndFinalizeVideo(
        job.videoContentId,
        completionStatus.completedJobs
      ).catch((error) => {
        logger.error(
          {
            videoId: job.videoContentId,
            error: error instanceof Error ? error.message : String(error)
          },
          "[VideoGenerationService] Composition failed"
        );
      });
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
    const startTime = Date.now();

    // Validate payload
    if (!payload.request_id) {
      logger.error(
        { payload },
        "[VideoGenerationService] Fal webhook missing request_id"
      );
      return; // Don't throw - return gracefully to prevent retries
    }

    logger.info(
      {
        requestId: payload.request_id,
        status: payload.status,
        fallbackJobId
      },
      "[VideoGenerationService] Processing Fal webhook"
    );

    // Look up video_job by requestId
    let job = await db
      .select()
      .from(videoJobs)
      .where(eq(videoJobs.requestId, payload.request_id))
      .limit(1)
      .then((rows) => rows[0] || null);

    // Fallback lookup by jobId from query param
    if (!job && fallbackJobId) {
      job = await db
        .select()
        .from(videoJobs)
        .where(eq(videoJobs.id, fallbackJobId))
        .limit(1)
        .then((rows) => rows[0] || null);

      if (job) {
        logger.warn(
          {
            requestId: payload.request_id,
            fallbackJobId
          },
          "[VideoGenerationService] Webhook fallback lookup by jobId"
        );

        // Attach requestId if missing
        if (!job.requestId) {
          await db
            .update(videoJobs)
            .set({
              requestId: payload.request_id,
              updatedAt: new Date()
            })
            .where(eq(videoJobs.id, job.id));
        }
      }
    }

    // Short-circuit if job not found
    if (!job) {
      logger.warn(
        { requestId: payload.request_id },
        "[VideoGenerationService] Received webhook for unknown job"
      );
      return;
    }

    const falCompletionTime = new Date();

    if (!job.processingCompletedAt) {
      await db
        .update(videoJobs)
        .set({
          processingCompletedAt: falCompletionTime,
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, job.id));

      job = {
        ...job,
        processingCompletedAt: falCompletionTime
      };
    }

    // Idempotency check: skip if already completed
    if (job.status === "completed") {
      logger.info(
        {
          jobId: job.id,
          requestId: payload.request_id
        },
        "[VideoGenerationService] Ignoring duplicate webhook for completed job"
      );
      return;
    }

    // Skip if job was canceled
    if (job.status === "canceled") {
      logger.info(
        {
          jobId: job.id,
          requestId: payload.request_id
        },
        "[VideoGenerationService] Ignoring webhook for canceled job"
      );
      return;
    }

    // Handle ERROR status from fal.ai
    if (payload.status === "ERROR" || !payload.payload?.video?.url) {
      const errorMessage =
        payload.error || "Kling reported an error during video generation";

      // Mark job as failed
      await db
        .update(videoJobs)
        .set({
          status: "failed",
          errorMessage,
          errorType: "FAL_ERROR",
          errorRetryable: false,
          processingCompletedAt: job.processingCompletedAt ?? falCompletionTime,
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, job.id));

      // Propagate failure to parent video
      await db
        .update(videos)
        .set({
          status: "failed",
          errorMessage: `Job ${job.id} failed: ${errorMessage}`,
          updatedAt: new Date()
        })
        .where(eq(videos.id, job.videoContentId));

      logger.error(
        {
          jobId: job.id,
          videoId: job.videoContentId,
          requestId: payload.request_id,
          error: errorMessage,
          duration: Date.now() - startTime
        },
        "[VideoGenerationService] Video job generation failed"
      );

      // Send failure webhook notification
      await this.sendJobFailureWebhook(job, errorMessage, "FAL_ERROR", false);

      return;
    }

    // Success case: download provider video and upload to storage
    try {
      const falVideoUrl = payload.payload.video.url;
      await this.handleProviderSuccess(job, falVideoUrl, {
        durationSeconds:
          payload.payload.video.metadata?.duration ??
          this.getJobDurationSeconds(job),
        expectedFileSize: payload.payload.video.file_size ?? undefined
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to process webhook";

      // Mark job as failed
      await db
        .update(videoJobs)
        .set({
          status: "failed",
          errorMessage,
          errorType: "WEBHOOK_PROCESSING_ERROR",
          errorRetryable: true,
          processingCompletedAt: job.processingCompletedAt ?? falCompletionTime,
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, job.id));

      logger.error(
        {
          jobId: job.id,
          videoId: job.videoContentId,
          requestId: payload.request_id,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          duration: Date.now() - startTime
        },
        "[VideoGenerationService] Failed to process fal webhook"
      );

      // Don't throw - let the webhook return 200 OK
      // The error is logged and the job is marked as failed
    }
  }

  /**
   * Send webhook notification to Vercel app for job completion
   * Includes retry logic and delivery tracking
   */
  private async sendJobCompletionWebhook(
    job: DBVideoContentJob,
    result: VideoJobResult
  ): Promise<void> {
    const videoContext = await this.getVideoContext(job.videoContentId);

    if (!videoContext) {
      logger.error(
        { jobId: job.id, videoId: job.videoContentId },
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
      // Update delivery attempt tracking
      await db
        .update(videoJobs)
        .set({
          deliveryAttempedAt: new Date(),
          deliveryAttemptCount: (job.deliveryAttemptCount || 0) + 1,
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, job.id));

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

      // Update delivery error tracking
      await db
        .update(videoJobs)
        .set({
          deliveryLastError: errorMessage,
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, job.id));

      // Don't throw - webhook failures shouldn't fail the job
      // The job is already marked as completed with the video URLs
    }
  }

  /**
   * Send webhook notification for job failure
   */
  private async sendJobFailureWebhook(
    job: DBVideoContentJob,
    errorMessage: string,
    errorType: string,
    errorRetryable: boolean
  ): Promise<void> {
    let videoContext: VideoContext;
    try {
      videoContext = await this.getVideoContext(job.videoContentId);
    } catch (error) {
      logger.error(
        {
          jobId: job.id,
          videoId: job.videoContentId,
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
    completedJobs: (typeof videoJobs.$inferSelect)[];
  }> {
    const jobs = await db
      .select()
      .from(videoJobs)
      .where(eq(videoJobs.videoContentId, videoId));

    if (jobs.length === 0) {
      return { allCompleted: false, completedJobs: [] };
    }

    const completedJobs = filterAndSortCompletedJobs(jobs);

    const allDone = jobs.every(
      (job) => job.status === "completed" || job.status === "failed"
    );
    const allFailed = jobs.every((job) => job.status === "failed");

    if (allFailed) {
      logger.error(
        { videoId, jobCount: jobs.length },
        "[VideoGenerationService] All jobs failed, cannot compose video"
      );

      await db
        .update(videos)
        .set({
          status: "failed",
          errorMessage: "All video jobs failed",
          updatedAt: new Date()
        })
        .where(eq(videos.id, videoId));

      try {
        const videoContext = await this.getVideoContext(videoId);
        await this.sendFinalVideoWebhook(videoContext, {
          status: "failed",
          errorMessage: "All video jobs failed"
        });
      } catch (error) {
        logger.error(
          {
            videoId,
            error: error instanceof Error ? error.message : String(error)
          },
          "[VideoGenerationService] Failed to send final failure webhook"
        );
      }

      return { allCompleted: false, completedJobs: [] };
    }

    if (!allDone || completedJobs.length === 0) {
      return { allCompleted: false, completedJobs };
    }

    return { allCompleted: true, completedJobs };
  }

  /**
   * Compose all completed job videos into final video and upload to storage
   * Phase 5: Composition & Finalization
   */
  private async composeAndFinalizeVideo(
    videoId: string,
    completedJobs: (typeof videoJobs.$inferSelect)[]
  ): Promise<void> {
    const startTime = Date.now();
    const videoContext = await this.getVideoContext(videoId);

    logger.info(
      { videoId },
      "[VideoGenerationService] Starting video composition"
    );

    try {
      // Step 1: Mark parent video as processing (composition)
      await db
        .update(videos)
        .set({
          status: "processing",
          updatedAt: new Date()
        })
        .where(eq(videos.id, videoId));

      // Step 2: Get completed jobs (use prefetched list if provided)
      if (completedJobs.length === 0) {
        throw new Error("No completed jobs found for composition");
      }

      logger.info(
        {
          videoId,
          jobCount: completedJobs.length
        },
        "[VideoGenerationService] Composing videos"
      );

      const clips = buildClipsFromJobs(completedJobs);
      const orientation = getOrientationFromJobs(completedJobs);
      const renderJobId = await createRenderJobRecord(videoId);

      const jobId = remotionRenderQueue.createJob(
        {
          videoId,
          listingId: videoContext.listingId,
          userId: videoContext.userId,
          clips,
          orientation,
          transitionDurationSeconds: 0.5
        },
        {
          onStart: async (_data: RenderJobData) => {
            await markRenderJobProcessing(renderJobId);
          },
          onProgress: async (progress: number, _data: RenderJobData) => {
            await updateRenderJobProgress(renderJobId, progress);
          },
          onComplete: async (
            renderResult: {
              videoBuffer: Buffer;
              thumbnailBuffer: Buffer;
              durationSeconds: number;
              fileSize: number;
            },
            _data: RenderJobData
          ) => {
            const videoKey = getFinalVideoPath(
              videoContext.userId,
              videoContext.listingId,
              videoId
            );
            const thumbnailKey = getThumbnailPath(
              videoContext.userId,
              videoContext.listingId,
              videoId
            );

            const [videoUrl, thumbnailUrl] = await Promise.all([
              storageService.uploadFile({
                key: videoKey,
                body: renderResult.videoBuffer,
                contentType: "video/mp4",
                metadata: {
                  userId: videoContext.userId,
                  listingId: videoContext.listingId,
                  videoId
                }
              }),
              storageService.uploadFile({
                key: thumbnailKey,
                body: renderResult.thumbnailBuffer,
                contentType: "image/jpeg",
                metadata: {
                  userId: videoContext.userId,
                  listingId: videoContext.listingId,
                  videoId
                }
              })
            ]);

            const composedResult: ComposedVideoResult = {
              videoUrl,
              thumbnailUrl,
              duration: renderResult.durationSeconds,
              fileSize: renderResult.fileSize
            };

            const persisted = await this.persistFinalVideoResult(
              videoId,
              composedResult
            );

            if (!persisted) {
              logger.warn(
                { videoId },
                "[VideoGenerationService] Final video persisted via webhook fallback"
              );
            }

            logger.info(
              {
                videoId,
                jobId,
                videoUrl: composedResult.videoUrl,
                thumbnailUrl: composedResult.thumbnailUrl,
                duration: composedResult.duration,
                fileSize: composedResult.fileSize,
                compositionDuration: Date.now() - startTime
              },
              "[VideoGenerationService] Video composition completed"
            );

            await this.sendFinalVideoWebhook(videoContext, {
              status: "completed",
              result: composedResult
            });

            await markRenderJobCompleted(renderJobId, videoUrl, thumbnailUrl);

            return { videoUrl, thumbnailUrl };
          },
          onError: async (error: Error, _data: RenderJobData) => {
            await db
              .update(videos)
              .set({
                status: "failed",
                errorMessage: error.message,
                updatedAt: new Date()
              })
              .where(eq(videos.id, videoId));

            await this.sendFinalVideoWebhook(videoContext, {
              status: "failed",
              errorMessage: error.message
            });

            await markRenderJobFailed(renderJobId, error.message);
          }
        },
        renderJobId
      );

      logger.info(
        {
          videoId,
          jobId: renderJobId,
          compositionDuration: Date.now() - startTime
        },
        "[VideoGenerationService] Video composition queued"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Composition failed";

      logger.error(
        {
          videoId,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          duration: Date.now() - startTime
        },
        "[VideoGenerationService] Video composition failed"
      );

      await db
        .update(videos)
        .set({
          status: "failed",
          errorMessage,
          updatedAt: new Date()
        })
        .where(eq(videos.id, videoId));

      await this.sendFinalVideoWebhook(videoContext, {
        status: "failed",
        errorMessage
      });
    }
  }

  private async persistFinalVideoResult(
    videoId: string,
    result: ComposedVideoResult
  ): Promise<boolean> {
    try {
      await db
        .update(videos)
        .set({
          status: "completed",
          videoUrl: result.videoUrl,
          thumbnailUrl: result.thumbnailUrl,
          metadata: {
            duration: result.duration,
            fileSize: result.fileSize
          },
          updatedAt: new Date()
        })
        .where(eq(videos.id, videoId));
      return true;
    } catch (error) {
      logger.error(
        {
          videoId,
          err: error instanceof Error ? error.message : String(error)
        },
        "[VideoGenerationService] Failed to persist final video result"
      );
      return false;
    }
  }

  /**
   * Send final webhook for completed parent video
   */
  private async sendFinalVideoWebhook(
    videoContext: VideoContext,
    payload: {
      status: "completed" | "failed";
      result?: {
        videoUrl: string;
        thumbnailUrl: string;
        duration: number;
        fileSize: number;
      };
      errorMessage?: string;
    }
  ): Promise<void> {
    const webhookUrl = `${process.env.VERCEL_API_URL}/api/v1/webhooks/video/final`;
    const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET;

    if (!webhookSecret) {
      logger.warn(
        { videoId: videoContext.videoId },
        "[VideoGenerationService] VERCEL_WEBHOOK_SECRET not configured, skipping final webhook"
      );
      return;
    }

    if (payload.status === "completed" && !payload.result) {
      throw new Error("Completed final webhook requires result payload");
    }

    // Build webhook payload matching VideoJobWebhookPayload structure
    const webhookPayload: VideoJobWebhookPayload = {
      jobId: videoContext.videoId, // Preserve jobId for schema compatibility
      videoId: videoContext.videoId,
      listingId: videoContext.listingId,
      status: payload.status,
      timestamp: new Date().toISOString(),
      result: payload.result,
      error: payload.errorMessage
        ? { message: payload.errorMessage, code: "COMPOSITION_ERROR" }
        : undefined
    };

    try {
      await webhookService.sendWebhook({
        url: webhookUrl,
        secret: webhookSecret,
        payload: webhookPayload,
        maxRetries: 5,
        backoffMs: 1000
      });

      logger.info(
        {
          videoId: videoContext.videoId,
          listingId: videoContext.listingId
        },
        "[VideoGenerationService] Final video webhook delivered"
      );
    } catch (error) {
      logger.error(
        {
          videoId: videoContext.videoId,
          error: error instanceof Error ? error.message : String(error)
        },
        "[VideoGenerationService] Failed to deliver final video webhook"
      );
      // Don't fail the composition if webhook fails
    } finally {
      this.videoContextCache.delete(videoContext.videoId);
    }
  }
}

export const videoGenerationService = new VideoGenerationService();
