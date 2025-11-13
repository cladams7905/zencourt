import logger from "@/config/logger";
import { s3Service } from "@/services/s3Service";
import {
  buildGenericUploadKey,
  buildUserProjectVideoKey
} from "@/lib/storagePaths";
import { klingService } from "./klingService";
import { videoRepository } from "./db/videoRepository";
import type {
  FalWebhookPayload,
  RoomVideoGenerateRequest
} from "@/types/requests";

class RoomVideoService {
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

    const requestId = await klingService.submitRoomVideo({
      prompt: request.prompt,
      imageUrls: request.imageUrls,
      duration: request.duration,
      aspectRatio: request.aspectRatio
    });

    await videoRepository.markProcessing({
      videoId: request.videoId,
      falRequestId: requestId,
      generationSettings: {
        ...request.metadata,
        prompt: request.prompt,
        imageUrls: request.imageUrls,
        duration: request.duration,
        aspectRatio: request.aspectRatio
      }
    });

    logger.info(
      {
        videoId: request.videoId,
        projectId: request.projectId,
        requestId
      },
      "[RoomVideoService] Room video generation started"
    );

    return { requestId };
  }

  async handleFalWebhook(payload: FalWebhookPayload): Promise<void> {
    if (!payload.request_id) {
      throw new Error("Fal webhook missing request_id");
    }

    const record = await videoRepository.findByFalRequestId(
      payload.request_id
    );

    if (!record) {
      logger.warn(
        { requestId: payload.request_id },
        "[RoomVideoService] Received webhook for unknown request"
      );
      return;
    }

    const { video, project } = record;

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
