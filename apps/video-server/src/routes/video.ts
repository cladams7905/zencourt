/**
 * Video processing routes
 * Handles video generation requests and status queries
 */

import { Router, Request, Response } from "express";
import logger from "@/config/logger";
import { validateApiKey } from "@/middleware/auth";
import {
  CancelVideoRequest,
  ErrorResponse,
  VideoServerGenerateRequest,
  VideoServerGenerateResponse
} from "@shared/types/api";
import { videoGenerationService } from "@/services/videoGenerationService";
import { videoRepository } from "@/services/db/videoRepository";
import { videoJobRepository } from "@/services/db/videoJobRepository";

const router = Router();

// Apply authentication middleware to all video routes
router.use(validateApiKey);

/**
 * POST /video/generate
 * Process video generation jobs using the new job-based workflow
 * Accepts parent videoId and jobIds, reads video_jobs from DB, dispatches to Fal
 */
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const requestData = req.body as VideoServerGenerateRequest;

    // Validate required fields
    const requiredFields: (keyof VideoServerGenerateRequest)[] = [
      "videoId",
      "jobIds",
      "projectId",
      "userId"
    ];

    const missingFields = requiredFields.filter((field) => !requestData[field]);
    if (missingFields.length > 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Invalid request",
        code: "VALIDATION_ERROR",
        details: {
          message: "Missing required fields",
          fields: missingFields
        }
      };

      logger.warn(
        {
          missingFields,
          videoId: requestData.videoId,
          projectId: requestData.projectId
        },
        "[VideoRoute] Invalid video generation request"
      );

      res.status(400).json(errorResponse);
      return;
    }

    // Validate jobIds is a non-empty array
    if (!Array.isArray(requestData.jobIds) || requestData.jobIds.length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: "Invalid request",
        code: "VALIDATION_ERROR",
        details: { message: "jobIds must be a non-empty array" }
      };

      res.status(400).json(errorResponse);
      return;
    }

    logger.info(
      {
        videoId: requestData.videoId,
        projectId: requestData.projectId,
        jobCount: requestData.jobIds.length,
        jobIds: requestData.jobIds
      },
      "[VideoRoute] Starting video generation for jobs"
    );

    const result = await videoGenerationService.startGeneration(requestData);

    const successResponse: VideoServerGenerateResponse = {
      success: true,
      message: "Video generation started",
      videoId: requestData.videoId,
      jobsStarted: result.jobsStarted
    };

    res.status(202).json(successResponse);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      "[VideoRoute] Failed to start video generation"
    );

    const errorResponse: ErrorResponse = {
      success: false,
      error: "Internal server error",
      code: "PROCESSING_ERROR",
      details:
        error instanceof Error ? error.message : "An unexpected error occurred"
    };

    res.status(500).json(errorResponse);
  }
});

/**
 * POST /video/cancel
 * Mark in-flight room videos and jobs as canceled
 */
router.post("/cancel", async (req: Request, res: Response) => {
  try {
    const { projectId, videoIds, reason } = req.body as CancelVideoRequest;

    if (!projectId) {
      res.status(400).json({
        success: false,
        error: "Invalid request",
        code: "VALIDATION_ERROR",
        details: { message: "projectId is required" }
      });
      return;
    }

    const cancelReason = reason?.trim() || "Canceled by user";

    const canceledVideos =
      Array.isArray(videoIds) && videoIds.length > 0
        ? await videoRepository.cancelVideosByIds(videoIds, cancelReason)
        : await videoRepository.cancelVideosByProject(projectId, cancelReason);

    const canceledJobs = await videoJobRepository.cancelJobsByProjectId(
      projectId,
      cancelReason
    );

    logger.info(
      { projectId, canceledVideos, canceledJobs },
      "Canceled video generation for project"
    );

    res.status(200).json({
      success: true,
      canceledVideos,
      canceledJobs
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to cancel video generation"
    );

    res.status(500).json({
      success: false,
      error: "Failed to cancel video generation"
    });
  }
});

export default router;
