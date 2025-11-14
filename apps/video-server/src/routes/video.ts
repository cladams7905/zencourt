/**
 * Video processing routes
 * Handles video generation requests and status queries
 */

import { Router, Request, Response } from 'express';
import { logger } from '@/config/logger';
import { validateApiKey } from '@/middleware/auth';
import {
  RoomVideoGenerateRequest,
  RoomVideoGenerateResponse,
  JobStatusResponse,
  ErrorResponse,
  CancelVideoRequest,
} from '@/types/requests';
import { roomVideoService } from '@/services/roomVideoService';
import { videoRepository } from '@/services/db/videoRepository';
import { videoJobRepository } from '@/services/db/videoJobRepository';

const router = Router();

// Apply authentication middleware to all video routes
router.use(validateApiKey);

/**
 * POST /video/generate
 * Submit a room video generation job to fal.ai through the video server
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const requestData = req.body as RoomVideoGenerateRequest;

    const requiredFields: (keyof RoomVideoGenerateRequest)[] = [
      'videoId',
      'projectId',
      'userId',
      'roomId',
      'prompt',
    ];

    const missingFields = requiredFields.filter((field) => !requestData[field]);
    if (missingFields.length > 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: {
          message: 'Missing required fields',
          fields: missingFields,
        },
      };

      logger.warn(
        {
          missingFields,
          videoId: requestData.videoId,
          projectId: requestData.projectId,
        },
        'Invalid room video generation request'
      );

      res.status(400).json(errorResponse);
      return;
    }

    if (!Array.isArray(requestData.imageUrls) || requestData.imageUrls.length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: { message: 'imageUrls must be a non-empty array' },
      };

      res.status(400).json(errorResponse);
      return;
    }

    const { requestId } = await roomVideoService.startGeneration(requestData);

    const successResponse: RoomVideoGenerateResponse = {
      success: true,
      requestId,
      videoId: requestData.videoId,
    };

    res.status(202).json(successResponse);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to start room video generation request'
    );

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal server error',
      code: 'PROCESSING_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    };

    res.status(500).json(errorResponse);
  }
});


/**
 * POST /video/cancel
 * Mark in-flight room videos and jobs as canceled
 */
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const { projectId, videoIds, reason } = req.body as CancelVideoRequest;

    if (!projectId) {
      res.status(400).json({
        success: false,
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: { message: 'projectId is required' },
      });
      return;
    }

    const cancelReason = reason?.trim() || 'Canceled by user';

    const canceledVideos = Array.isArray(videoIds) && videoIds.length > 0
      ? await videoRepository.cancelVideosByIds(videoIds, cancelReason)
      : await videoRepository.cancelVideosByProject(projectId, cancelReason);

    const canceledJobs = await videoJobRepository.cancelJobsByProject(
      projectId,
      cancelReason,
    );

    logger.info(
      { projectId, canceledVideos, canceledJobs },
      'Canceled video generation for project',
    );

    res.status(200).json({
      success: true,
      canceledVideos,
      canceledJobs,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      'Failed to cancel video generation',
    );

    res.status(500).json({
      success: false,
      error: 'Failed to cancel video generation',
    });
  }
});

/**
 * GET /video/status/:jobId
 * Query the status of a video processing job from the database
 */
router.get('/status/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;

    if (!jobId) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: {
          message: 'Missing jobId parameter',
        },
      };

      res.status(400).json(errorResponse);
      return;
    }

    // Get job from database (video_jobs table)
    const job = await videoJobRepository.findById(jobId);

    if (!job) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Not found',
        code: 'JOB_NOT_FOUND',
        details: {
          message: `Job with ID ${jobId} not found`,
        },
      };

      logger.warn(
        {
          jobId,
        },
        'Job not found in database'
      );

      res.status(404).json(errorResponse);
      return;
    }

    // Map database status to API status
    const statusMap: Record<string, 'queued' | 'processing' | 'completed' | 'failed'> = {
      'pending': 'queued',
      'processing': 'processing',
      'completed': 'completed',
      'failed': 'failed',
      'canceled': 'failed', // Treat canceled as failed for API response
    };

    const status = statusMap[job.status] || 'queued';
    const progress = job.progress ?? 0;

    const response: JobStatusResponse = {
      jobId,
      status,
      progress,
    };

    // Add error if job failed
    if ((status === 'failed' || job.status === 'canceled') && job.errorMessage) {
      response.error = job.errorMessage;
    }

    // Add result if job completed
    if (status === 'completed' && job.videoUrl) {
      response.result = {
        videoUrl: job.videoUrl,
        thumbnailUrl: job.thumbnailUrl ?? undefined,
        duration: job.duration ?? 0,
      };
    }

    logger.debug(
      {
        jobId,
        status,
        progress,
      },
      'Job status queried from database'
    );

    res.status(200).json(response);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        jobId: req.params.jobId,
      },
      'Failed to get job status from database'
    );

    const errorResponse: ErrorResponse = {
      success: false,
      error: 'Internal server error',
      code: 'PROCESSING_ERROR',
      details: error instanceof Error ? error.message : 'An unexpected error occurred',
    };

    res.status(500).json(errorResponse);
  }
});

export default router;
