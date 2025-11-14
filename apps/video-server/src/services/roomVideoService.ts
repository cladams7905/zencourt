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
import type {
  FalWebhookPayload,
  RoomVideoGenerateRequest
} from "@shared/types/api";

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

  async handleFalWebhook(
    payload: FalWebhookPayload,
    fallbackVideoId?: string
  ): Promise<void> {
    if (!payload.request_id) {
      throw new Error("Fal webhook missing request_id");
    }

    let record = await videoRepository.findByFalRequestId(
      payload.request_id
    );

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

        if (!fallbackRecord.video.falRequestId) {
          await videoRepository.attachFalRequestId({
            videoId: fallbackRecord.video.id,
            falRequestId: payload.request_id
          });
        }

        record = fallbackRecord;
      }
    }

    if (!record) {
      logger.warn(
        { requestId: payload.request_id },
        "[RoomVideoService] Received webhook for unknown request"
      );
      return;
    }

    const { video, project } = record;

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
          error: errorMessage
        },
        "[RoomVideoService] Room video generation failed"
      );
      return;
    }

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

    const buffer = await klingService.downloadVideoFile(
      payload.payload.video.url
    );

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

    const videoUrl = await s3Service.uploadFile({
      key,
      body: buffer,
      contentType: payload.payload.video.content_type || "video/mp4",
      metadata: {
        projectId: video.projectId,
        videoId: video.id,
        falRequestId: payload.request_id
      }
    });

    const duration =
      payload.payload.video.metadata?.duration !== undefined
        ? Math.round(payload.payload.video.metadata.duration)
        : 0;

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
        videoUrl
      },
      "[RoomVideoService] Room video uploaded and marked completed"
    );
  }
}

export const roomVideoService = new RoomVideoService();
