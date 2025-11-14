import logger from "@/config/logger";
import { s3Service } from "@/services/s3Service";
import {
  buildGenericUploadKey,
  buildUserProjectVideoKey
} from "@/lib/storagePaths";
import { env } from "@/config/env";
import { klingService } from "./klingService";
import { videoRepository } from "./db/videoRepository";
import { videoJobRepository } from "./db/videoJobRepository";
import { projectRepository } from "./db/projectRepository";
import { VideoCompositionService } from "./videoCompositionService";
import { nanoid } from "nanoid";
import type {
  FalWebhookPayload,
  RoomVideoGenerateRequest
} from "@shared/types/api";
import type { VideoCompositionSettings } from "@shared/types/video/composition";

class RoomVideoService {
  private buildWebhookUrl(videoId: string): string {
    try {
      const url = new URL(env.falWebhookUrl);
      url.searchParams.set("videoId", videoId);
      return url.toString();
    } catch {
      const separator = env.falWebhookUrl.includes("?") ? "&" : "?";
      return `${env.falWebhookUrl}${separator}videoId=${encodeURIComponent(videoId)}`;
    }
  }

  async startGeneration(
    request: RoomVideoGenerateRequest
  ): Promise<{ requestId: string }> {
    const requiredFields: Array<keyof RoomVideoGenerateRequest> = [
      "videoId",
      "projectId",
      "userId",
      "roomId",
      "prompt"
    ];

    const missing = requiredFields.filter((field) => !request[field]);
    if (missing.length > 0) {
      throw new Error(`Missing required fields: ${missing.join(", ")}`);
    }

    if (!request.imageUrls || request.imageUrls.length === 0) {
      throw new Error("At least one image URL is required");
    }

    const existingVideo = await videoRepository.findById(request.videoId);
    if (!existingVideo) {
      throw new Error(`Video record ${request.videoId} not found`);
    }

    const generationSettings = {
      ...request.metadata,
      prompt: request.prompt,
      imageUrls: request.imageUrls,
      duration: request.duration,
      aspectRatio: request.aspectRatio
    };

    await videoRepository.markSubmissionPending({
      videoId: request.videoId,
      generationSettings
    });

    // Create video_jobs entry if jobId is provided
    if (request.jobId) {
      await videoJobRepository.create({
        id: request.jobId,
        projectId: request.projectId,
        userId: request.userId,
        status: "pending",
        compositionSettings: generationSettings
      });
    }

    let requestId: string | null = null;

    try {
      requestId = await klingService.submitRoomVideo({
        prompt: request.prompt,
        imageUrls: request.imageUrls,
        duration: request.duration,
        aspectRatio: request.aspectRatio,
        webhookUrl: this.buildWebhookUrl(request.videoId)
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to submit request to fal.ai";

      await videoRepository.markFailed(request.videoId, message);

      // Mark video_jobs entry as failed if it exists
      if (request.jobId) {
        await videoJobRepository.markFailed(request.jobId, message);
      }

      throw error;
    }

    // Persist fal request_id in videos table
    await videoRepository.attachFalRequestId({
      videoId: request.videoId,
      falRequestId: requestId
    });

    // Mark video_jobs entry as submitted/processing
    if (request.jobId) {
      await videoJobRepository.markSubmitted(request.jobId);
    }

    logger.info(
      {
        videoId: request.videoId,
        projectId: request.projectId,
        jobId: request.jobId,
        requestId
      },
      "[RoomVideoService] Room video generation started"
    );

    return { requestId };
  }

  /**
   * Download video file with retry logic
   */
  private async downloadVideoWithRetry(
    url: string,
    maxRetries: number = 3
  ): Promise<Buffer> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        logger.debug(
          { url, attempt, maxRetries },
          "[RoomVideoService] Downloading video from fal.ai"
        );

        const buffer = await klingService.downloadVideoFile(url);

        logger.info(
          { url, attempt, bufferSize: buffer.length },
          "[RoomVideoService] Video download successful"
        );

        return buffer;
      } catch (error) {
        lastError =
          error instanceof Error ? error : new Error(String(error));

        logger.warn(
          {
            url,
            attempt,
            maxRetries,
            error: lastError.message
          },
          "[RoomVideoService] Video download failed, will retry"
        );

        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          const delayMs = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    throw new Error(
      `Failed to download video after ${maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Trigger automatic video composition when all room videos complete
   * This method runs in the background after a room video completes
   */
  private async triggerAutoComposition(projectId: string): Promise<void> {
    const compositionStartTime = Date.now();
    let compositionJobId: string | null = null;

    try {
      logger.info(
        { projectId },
        "[RoomVideoService] Starting auto-composition for project"
      );

      // Fetch project record
      const project = await projectRepository.findById(projectId);
      if (!project) {
        logger.error({ projectId }, "[RoomVideoService] Project not found for auto-composition");
        return;
      }

      // Get all completed room videos
      const completedVideos = await videoRepository.getCompletedRoomVideos(projectId);

      if (completedVideos.length === 0) {
        logger.warn({ projectId }, "[RoomVideoService] No completed videos found for composition");
        return;
      }

      // Extract video URLs
      const roomVideoUrls = completedVideos
        .map(v => v.videoUrl)
        .filter((url): url is string => url !== null && url !== undefined);

      if (roomVideoUrls.length === 0) {
        logger.error({ projectId }, "[RoomVideoService] No valid video URLs found");
        return;
      }

      // Create composition settings (use defaults for now)
      const compositionSettings: VideoCompositionSettings = {
        transitions: false,
        // logo and subtitles are optional and can be added later
      };

      // Generate final video ID and job ID
      const finalVideoId = nanoid();
      compositionJobId = `comp_${nanoid()}`;

      // Create video_jobs entry to track composition
      await videoJobRepository.create({
        id: compositionJobId,
        projectId,
        userId: project.userId,
        status: "pending",
        compositionSettings: compositionSettings as Record<string, unknown>
      });

      logger.info(
        {
          projectId,
          roomVideoCount: roomVideoUrls.length,
          finalVideoId,
          compositionJobId
        },
        "[RoomVideoService] Starting video composition"
      );

      // Record processing started
      await videoJobRepository.recordProcessingStarted(compositionJobId);

      // Initialize composition service
      const compositionService = new VideoCompositionService();

      // Combine room videos into final video
      const result = await compositionService.combineRoomVideos(
        roomVideoUrls,
        compositionSettings,
        project.userId,
        projectId,
        finalVideoId,
        project.title || undefined
      );

      // Update project with final video
      await projectRepository.markVideoCompleted({
        project,
        videoUrl: result.videoUrl,
        duration: result.duration,
        thumbnailUrl: result.thumbnailUrl || null,
        resolution: null // Resolution detection can be added later
      });

      // Record completion in video_jobs
      await videoJobRepository.recordProcessingCompleted({
        jobId: compositionJobId,
        videoUrl: result.videoUrl,
        duration: result.duration,
        thumbnailUrl: result.thumbnailUrl || undefined
      });

      logger.info(
        {
          projectId,
          finalVideoUrl: result.videoUrl,
          duration: result.duration,
          compositionDuration: Date.now() - compositionStartTime
        },
        "[RoomVideoService] Auto-composition completed successfully"
      );

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Auto-composition failed";

      logger.error(
        {
          projectId,
          compositionJobId,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          compositionDuration: Date.now() - compositionStartTime
        },
        "[RoomVideoService] Auto-composition failed"
      );

      // Mark video_jobs entry as failed if it was created
      if (compositionJobId) {
        await videoJobRepository.markFailed(compositionJobId, errorMessage);
      }

      // Update project with failure status
      const project = await projectRepository.findById(projectId);
      if (project) {
        await projectRepository.markVideoFailed({
          project,
          errorMessage,
          errorType: "COMPOSITION_ERROR",
          retryable: true
        });
      }
    }
  }

  async handleFalWebhook(
    payload: FalWebhookPayload,
    fallbackVideoId?: string
  ): Promise<void> {
    const startTime = Date.now();

    // Validate payload
    if (!payload.request_id) {
      logger.error(
        { payload },
        "[RoomVideoService] Fal webhook missing request_id"
      );
      return; // Don't throw - return gracefully to prevent retries
    }

    // Look up video record by falRequestId
    let record = await videoRepository.findByFalRequestId(
      payload.request_id
    );

    // Fallback lookup by videoId (legacy webhooks)
    if (!record && fallbackVideoId) {
      const fallbackRecord =
        await videoRepository.findByIdWithProject(fallbackVideoId);

      if (fallbackRecord) {
        logger.warn(
          {
            requestId: payload.request_id,
            fallbackVideoId
          },
          "[RoomVideoService] Webhook fallback lookup by videoId"
        );

        // Attach falRequestId if missing
        if (!fallbackRecord.video.falRequestId) {
          await videoRepository.attachFalRequestId({
            videoId: fallbackRecord.video.id,
            falRequestId: payload.request_id
          });
        }

        record = fallbackRecord;
      }
    }

    // Short-circuit if video record not found
    if (!record) {
      logger.warn(
        { requestId: payload.request_id },
        "[RoomVideoService] Received webhook for unknown request"
      );
      return;
    }

    const { video, project } = record;

    // Idempotency check: skip if already completed
    if (video.status === "completed") {
      logger.info(
        {
          videoId: video.id,
          requestId: payload.request_id
        },
        "[RoomVideoService] Ignoring duplicate webhook for completed video"
      );
      return;
    }

    // Skip if video was canceled
    if (video.status === "canceled") {
      logger.info(
        {
          videoId: video.id,
          requestId: payload.request_id
        },
        "[RoomVideoService] Ignoring webhook for canceled video"
      );
      return;
    }

    // Handle ERROR status from fal.ai
    if (payload.status === "ERROR" || !payload.payload?.video?.url) {
      const errorMessage =
        payload.error ||
        "Fal.ai reported an error during room video generation";

      await videoRepository.markFailed(video.id, errorMessage);

      logger.error(
        {
          videoId: video.id,
          projectId: video.projectId,
          requestId: payload.request_id,
          error: errorMessage,
          duration: Date.now() - startTime
        },
        "[RoomVideoService] Room video generation failed"
      );
      return;
    }

    try {
      // Download video with retry logic
      const buffer = await this.downloadVideoWithRetry(
        payload.payload.video.url
      );

      // Generate S3 key for video
      const filename = `${video.roomName || video.roomId || video.id}.mp4`;
      const key =
        project && project.userId
          ? buildUserProjectVideoKey(
              project.userId,
              video.projectId,
              filename,
              video.id
            )
          : buildGenericUploadKey("videos", filename);

      // Upload to S3 with metadata
      const videoUrl = await s3Service.uploadFile({
        key,
        body: buffer,
        contentType: payload.payload.video.content_type || "video/mp4",
        metadata: {
          projectId: video.projectId,
          videoId: video.id,
          falRequestId: payload.request_id,
          falFileSize: String(payload.payload.video.file_size || 0),
          falContentType: payload.payload.video.content_type || "video/mp4"
        }
      });

      // Extract duration from fal.ai metadata
      const duration =
        payload.payload.video.metadata?.duration !== undefined
          ? Math.round(payload.payload.video.metadata.duration)
          : 0;

      // Mark video as completed
      await videoRepository.markCompleted({
        videoId: video.id,
        videoUrl,
        duration,
        thumbnailUrl: null
      });

      logger.info(
        {
          videoId: video.id,
          projectId: video.projectId,
          videoUrl,
          duration,
          fileSize: payload.payload.video.file_size,
          processingDuration: Date.now() - startTime
        },
        "[RoomVideoService] Room video uploaded and marked completed"
      );

      // Check if all room videos are complete, and if so, trigger auto-composition
      const completedCount = await videoRepository.countCompletedRoomVideos(video.projectId);
      const totalCount = await videoRepository.countTotalRoomVideos(video.projectId);

      logger.info(
        {
          projectId: video.projectId,
          completedCount,
          totalCount
        },
        "[RoomVideoService] Checking if all room videos complete"
      );

      if (completedCount === totalCount && totalCount > 0) {
        logger.info(
          { projectId: video.projectId },
          "[RoomVideoService] All room videos complete - triggering auto-composition"
        );

        // Trigger composition in background (don't wait for it to complete)
        this.triggerAutoComposition(video.projectId).catch(error => {
          logger.error(
            {
              projectId: video.projectId,
              error: error instanceof Error ? error.message : String(error),
              stack: error instanceof Error ? error.stack : undefined
            },
            "[RoomVideoService] Auto-composition background task failed"
          );
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to process webhook";

      // Mark video as failed
      await videoRepository.markFailed(video.id, errorMessage);

      logger.error(
        {
          videoId: video.id,
          projectId: video.projectId,
          requestId: payload.request_id,
          error: errorMessage,
          stack: error instanceof Error ? error.stack : undefined,
          duration: Date.now() - startTime
        },
        "[RoomVideoService] Failed to process fal webhook"
      );

      // Don't throw - let the webhook return 200 OK
      // The error is logged and the video is marked as failed
    }
  }
}

export const roomVideoService = new RoomVideoService();
