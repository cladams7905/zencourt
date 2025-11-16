/**
 * Video Generation Service
 * Handles the new job-based video generation workflow
 * Reads video_jobs from DB, dispatches to Fal, manages state transitions
 */

import logger from "@/config/logger";
import { env } from "@/config/env";
import { klingService } from "./klingService";
import { ffmpegService } from "./ffmpegService";
import { s3Service } from "./s3Service";
import { webhookService } from "./webhookService";
import { db, videoJobs, videos, projects } from "@db/client";
import { eq, inArray } from "drizzle-orm";
import type {
  VideoServerGenerateRequest,
  FalWebhookPayload,
  VideoJobResult,
  VideoJobWebhookPayload
} from "@shared/types/api";
import type { DBVideoJob } from "@shared/types/models";
import type { ComposedVideoResult } from "@shared/types/video/composition";

interface GenerationResult {
  jobsStarted: number;
  failedJobs: string[];
}

interface VideoContext {
  videoId: string;
  projectId: string;
  userId: string;
}

class VideoGenerationService {
  private async getVideoContext(videoId: string): Promise<VideoContext> {
    const [record] = await db
      .select({
        videoId: videos.id,
        projectId: videos.projectId,
        userId: projects.userId
      })
      .from(videos)
      .leftJoin(projects, eq(videos.projectId, projects.id))
      .where(eq(videos.id, videoId))
      .limit(1);

    if (!record?.videoId || !record?.projectId || !record?.userId) {
      throw new Error(
        `Video context missing for video ${videoId} (ensure project/user exists)`
      );
    }

    return {
      videoId: record.videoId,
      projectId: record.projectId,
      userId: record.userId
    };
  }

  private buildStorageBasePath(context: VideoContext): string {
    return `user_${context.userId}/projects/project_${context.projectId}/videos/video_${context.videoId}`;
  }

  /**
   * Build webhook URL for Fal callback
   * Uses requestId instead of videoId for proper job matching
   */
  private buildWebhookUrl(requestId: string): string {
    try {
      const url = new URL(env.falWebhookUrl);
      url.searchParams.set("requestId", requestId);
      return url.toString();
    } catch {
      const separator = env.falWebhookUrl.includes("?") ? "&" : "?";
      return `${env.falWebhookUrl}${separator}requestId=${encodeURIComponent(
        requestId
      )}`;
    }
  }

  /**
   * Start video generation for multiple jobs
   * Phase 3 implementation:
   * - Read video_jobs from DB using jobIds
   * - Extract generationSettings from each job
   * - Dispatch to Fal per job
   * - Update statuses to "processing" with timestamps
   */
  async startGeneration(
    request: VideoServerGenerateRequest
  ): Promise<GenerationResult> {
    const { videoId, jobIds, projectId, userId } = request;

    logger.info(
      {
        videoId,
        projectId,
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
    const invalidJobs = jobs.filter((job) => job.videoId !== videoId);
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

    // Step 3: Dispatch each job to Fal
    const failedJobs: string[] = [];
    let successCount = 0;

    for (const job of jobs) {
      try {
        await this.dispatchJobToFal(job);
        successCount++;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to dispatch job to Fal";

        logger.error(
          {
            jobId: job.id,
            videoId,
            error: errorMessage
          },
          "[VideoGenerationService] Failed to dispatch job"
        );

        failedJobs.push(job.id);

        // Mark job as failed
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
    }

    // If all jobs failed, mark parent video as failed
    if (successCount === 0) {
      await db
        .update(videos)
        .set({
          status: "failed",
          errorMessage: "All video jobs failed to dispatch to Fal",
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
   * Dispatch a single job to Fal
   * Extracts generationSettings, calls Fal API, updates job status
   */
  private async dispatchJobToFal(job: DBVideoJob): Promise<void> {
    // Extract generation settings
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

    // Determine aspect ratio from orientation
    const aspectRatio = orientation === "vertical" ? "9:16" : "16:9";

    logger.info(
      {
        jobId: job.id,
        videoId: job.videoId,
        imageCount: imageUrls.length,
        aspectRatio
      },
      "[VideoGenerationService] Dispatching job to Fal"
    );

    // Call Fal API
    const requestId = await klingService.submitRoomVideo({
      prompt,
      imageUrls,
      duration: "5", // Default for now, can be added to generationSettings later
      aspectRatio,
      webhookUrl: this.buildWebhookUrl(job.id) // Use jobId for webhook matching
    });

    logger.info(
      {
        jobId: job.id,
        requestId
      },
      "[VideoGenerationService] Fal request submitted successfully"
    );

    // Step 4: Update job status to "processing" with timestamps
    await db
      .update(videoJobs)
      .set({
        requestId,
        status: "processing",
        processingStartedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(videoJobs.id, job.id));

    logger.info(
      {
        jobId: job.id,
        videoId: job.videoId,
        requestId
      },
      "[VideoGenerationService] Job marked as processing"
    );
  }

  /**
   * Handle Fal webhook for job completion
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
        payload.error || "Fal.ai reported an error during video generation";

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
        .where(eq(videos.id, job.videoId));

      logger.error(
        {
          jobId: job.id,
          videoId: job.videoId,
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

    // Success case: Process video and upload to S3
    try {
      const falVideoUrl = payload.payload.video.url;
      const videoContext = await this.getVideoContext(job.videoId);
      const storageBasePath = this.buildStorageBasePath(videoContext);

      logger.info(
        {
          jobId: job.id,
          videoId: job.videoId,
          falVideoUrl
        },
        "[VideoGenerationService] Processing video from Fal"
      );

      // Step 1: Download from Fal, process with FFmpeg
      const targetAspectRatio =
        job.generationSettings?.orientation === "vertical" ? "9:16" : "16:9";

      const processedVideo = await ffmpegService.processVideo({
        sourceUrl: falVideoUrl,
        jobId: job.id,
        normalize: true,
        targetAspectRatio
      });

      // Step 2: Upload processed video and thumbnail to S3
      const videoKey = `${storageBasePath}/jobs/job_${job.id}/video.mp4`;
      const thumbnailKey = `${storageBasePath}/jobs/job_${job.id}/thumbnail.jpg`;

      const [videoUrl, thumbnailUrl] = await Promise.all([
        s3Service.uploadFile({
          key: videoKey,
          body: processedVideo.videoBuffer,
          contentType: "video/mp4",
          metadata: {
            jobId: job.id,
            videoId: job.videoId,
            projectId: videoContext.projectId,
            userId: videoContext.userId,
            generationModel: job.generationModel || "kling1.6"
          }
        }),
        s3Service.uploadFile({
          key: thumbnailKey,
          body: processedVideo.thumbnailBuffer,
          contentType: "image/jpeg",
          metadata: {
            jobId: job.id,
            videoId: job.videoId,
            projectId: videoContext.projectId,
            userId: videoContext.userId
          }
        })
      ]);

      // Step 3: Update video_jobs with processed URLs and metadata
      await db
        .update(videoJobs)
        .set({
          status: "completed",
          videoUrl,
          thumbnailUrl,
          metadata: {
            ...job.metadata,
            duration: processedVideo.metadata.duration,
            fileSize: processedVideo.metadata.fileSize,
            resolution: {
              width: processedVideo.metadata.width,
              height: processedVideo.metadata.height
            },
            orientation: job.generationSettings?.orientation || "landscape"
          },
          processingCompletedAt: job.processingCompletedAt ?? falCompletionTime,
          updatedAt: new Date()
        })
        .where(eq(videoJobs.id, job.id));

      logger.info(
        {
          jobId: job.id,
          videoId: job.videoId,
          videoUrl,
          thumbnailUrl,
          duration: processedVideo.metadata.duration,
          fileSize: processedVideo.metadata.fileSize,
          processingDuration: Date.now() - startTime
        },
        "[VideoGenerationService] ✅ Video job completed and uploaded to S3"
      );

      // Step 4: Send webhook to Vercel app for job completion
      await this.sendJobCompletionWebhook(job, {
        videoUrl,
        thumbnailUrl,
        duration: processedVideo.metadata.duration,
        fileSize: processedVideo.metadata.fileSize,
        resolution: {
          width: processedVideo.metadata.width,
          height: processedVideo.metadata.height
        }
      });

      // Step 5: Check if all jobs for this video are completed
      const completionStatus = await this.evaluateJobCompletion(job.videoId);

      if (completionStatus.allCompleted) {
        logger.info(
          { videoId: job.videoId },
          "[VideoGenerationService] All jobs completed, triggering composition"
        );

        // Trigger composition asynchronously - don't block webhook response
        this.composeAndFinalizeVideo(
          job.videoId,
          completionStatus.completedJobs
        ).catch((error) => {
          logger.error(
            {
              videoId: job.videoId,
              error: error instanceof Error ? error.message : String(error)
            },
            "[VideoGenerationService] Composition failed"
          );
        });
      }
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
          videoId: job.videoId,
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
    job: DBVideoJob,
    result: VideoJobResult
  ): Promise<void> {
    const videoContext = await this.getVideoContext(job.videoId);

    if (!videoContext) {
      logger.error(
        { jobId: job.id, videoId: job.videoId },
        "[VideoGenerationService] Cannot send webhook: parent video not found"
      );
      return;
    }

    // Build webhook URL from Vercel API URL
    const webhookUrl = `${env.vercelApiUrl}/api/v1/webhooks/video`;
    const webhookSecret = env.webhookSigningSecret;

    if (!webhookSecret) {
      logger.warn(
        { jobId: job.id },
        "[VideoGenerationService] VERCEL_WEBHOOK_SIGNING_KEY not configured, skipping webhook delivery"
      );
      return;
    }

    const payload: VideoJobWebhookPayload = {
      jobId: job.id,
      projectId: videoContext.projectId,
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
        { jobId: job.id, projectId: videoContext.projectId },
        "[VideoGenerationService] ✅ Webhook delivered successfully"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to deliver webhook";

      logger.error(
        {
          jobId: job.id,
          projectId: videoContext.projectId,
          error: errorMessage
        },
        "[VideoGenerationService] ❌ Webhook delivery failed"
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
    job: DBVideoJob,
    errorMessage: string,
    errorType: string,
    errorRetryable: boolean
  ): Promise<void> {
    let videoContext: VideoContext;
    try {
      videoContext = await this.getVideoContext(job.videoId);
    } catch (error) {
      logger.error(
        {
          jobId: job.id,
          videoId: job.videoId,
          error: error instanceof Error ? error.message : String(error)
        },
        "[VideoGenerationService] Cannot send failure webhook: missing video context"
      );
      return;
    }

    // Build webhook URL from Vercel API URL
    const webhookUrl = `${env.vercelApiUrl}/api/v1/webhooks/video`;
    const webhookSecret = env.webhookSigningSecret;

    if (!webhookUrl || !webhookSecret) {
      return;
    }

    const payload: VideoJobWebhookPayload = {
      jobId: job.id,
      projectId: videoContext.projectId,
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
        { jobId: job.id, projectId: videoContext.projectId },
        "[VideoGenerationService] ✅ Failure webhook delivered"
      );
    } catch (error) {
      logger.error(
        {
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error)
        },
        "[VideoGenerationService] ❌ Failed to deliver failure webhook"
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
      .where(eq(videoJobs.videoId, videoId));

    if (jobs.length === 0) {
      return { allCompleted: false, completedJobs: [] };
    }

    const completedJobs = jobs
      .filter((job) => job.status === "completed" && job.videoUrl)
      .sort((a, b) => {
        const orderA = a.generationSettings?.sortOrder ?? 0;
        const orderB = b.generationSettings?.sortOrder ?? 0;
        return orderA - orderB;
      });

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
   * Compose all completed job videos into final video and upload to S3
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

      const roomVideoUrls = completedJobs.map((job) => job.videoUrl!);

      logger.info(
        {
          videoId,
          jobCount: completedJobs.length,
          roomVideoUrls
        },
        "[VideoGenerationService] Composing videos"
      );

      // Step 3: Use VideoCompositionService to combine videos
      // TODO: Get actual composition settings from somewhere (project metadata?)
      const compositionSettings = {
        transitions: true,
        logo: undefined,
        subtitles: undefined
      };

      const { videoCompositionService } = await import(
        "./videoCompositionService"
      );

      const composedResult = await videoCompositionService.combineRoomVideos(
        roomVideoUrls,
        compositionSettings,
        videoContext.userId || "",
        videoContext.projectId,
        videoId,
        undefined // projectName
      );

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
          videoUrl: composedResult.videoUrl,
          thumbnailUrl: composedResult.thumbnailUrl,
          duration: composedResult.duration,
          fileSize: composedResult.fileSize,
          compositionDuration: Date.now() - startTime
        },
        "[VideoGenerationService] ✅ Video composition completed"
      );

      // Step 5: Send final webhook to Vercel app
      await this.sendFinalVideoWebhook(videoContext, {
        status: "completed",
        result: composedResult
      });
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
        "[VideoGenerationService] ❌ Video composition failed"
      );

      // Mark parent video as failed
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

      // TODO: Optionally retry based on error type
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
    const webhookUrl = `${env.vercelApiUrl}/api/v1/webhooks/video/final`;
    const webhookSecret = env.webhookSigningSecret;

    if (!webhookSecret) {
      logger.warn(
        { videoId: videoContext.videoId },
        "[VideoGenerationService] VERCEL_WEBHOOK_SIGNING_KEY not configured, skipping final webhook"
      );
      return;
    }

    if (payload.status === "completed" && !payload.result) {
      throw new Error("Completed final webhook requires result payload");
    }

    const body = {
      videoId: videoContext.videoId,
      projectId: videoContext.projectId,
      status: payload.status,
      timestamp: new Date().toISOString(),
      result: payload.result,
      error: payload.errorMessage
        ? { message: payload.errorMessage }
        : undefined
    };

    try {
      await webhookService.sendWebhook({
        url: webhookUrl,
        secret: webhookSecret,
        payload: body as any,
        maxRetries: 5,
        backoffMs: 1000
      });

      logger.info(
        {
          videoId: videoContext.videoId,
          projectId: videoContext.projectId
        },
        "[VideoGenerationService] ✅ Final video webhook delivered"
      );
    } catch (error) {
      logger.error(
        {
          videoId: videoContext.videoId,
          error: error instanceof Error ? error.message : String(error)
        },
        "[VideoGenerationService] ❌ Failed to deliver final video webhook"
      );
      // Don't fail the composition if webhook fails
    }
  }
}

export const videoGenerationService = new VideoGenerationService();
