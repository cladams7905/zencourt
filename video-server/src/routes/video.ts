/**
 * Video processing routes
 * Handles video generation requests and status queries
 */

import { Router, Request, Response } from 'express';
import { logger } from '@/config/logger';
import { validateApiKey } from '@/middleware/auth';
import { addVideoJob, getJobStatus, getQueueStats } from '@/queues/videoQueue';
import {
  VideoProcessRequest,
  VideoProcessResponse,
  JobStatusResponse,
  ErrorResponse,
} from '@/types/requests';
import { VideoJob } from '@/types/queue';

const router = Router();

// Apply authentication middleware to all video routes
router.use(validateApiKey);

/**
 * POST /video/process
 * Submit a video processing job to the queue
 */
router.post('/process', async (req: Request, res: Response) => {
  try {
    // Validate request body
    const requestData = req.body as VideoProcessRequest;

    // Validate required fields
    const requiredFields: (keyof VideoProcessRequest)[] = [
      'jobId',
      'projectId',
      'userId',
      'roomVideoUrls',
      'compositionSettings',
      'webhookUrl',
      'webhookSecret',
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
          requestData: {
            jobId: requestData.jobId,
            projectId: requestData.projectId,
          },
        },
        'Invalid video process request'
      );

      res.status(400).json(errorResponse);
      return;
    }

    // Validate roomVideoUrls is an array with at least one URL
    if (!Array.isArray(requestData.roomVideoUrls) || requestData.roomVideoUrls.length === 0) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Invalid request',
        code: 'VALIDATION_ERROR',
        details: {
          message: 'roomVideoUrls must be a non-empty array',
        },
      };

      logger.warn(
        {
          jobId: requestData.jobId,
          roomVideoUrls: requestData.roomVideoUrls,
        },
        'Invalid roomVideoUrls in request'
      );

      res.status(400).json(errorResponse);
      return;
    }

    // Check queue length before adding job
    const queueStats = await getQueueStats();
    const totalPendingJobs = queueStats.waiting + queueStats.active;

    // Reject if queue is too full (requirement 11.4)
    if (totalPendingJobs >= 100) {
      const errorResponse: ErrorResponse = {
        success: false,
        error: 'Service unavailable',
        code: 'QUEUE_FULL',
        details: {
          message: 'Queue is at capacity, please try again later',
          queueLength: totalPendingJobs,
        },
      };

      logger.warn(
        {
          jobId: requestData.jobId,
          queueLength: totalPendingJobs,
        },
        'Queue full, rejecting new job'
      );

      res.status(503).json(errorResponse);
      return;
    }

    // Create video job from request
    const videoJob: VideoJob = {
      jobId: requestData.jobId,
      projectId: requestData.projectId,
      userId: requestData.userId,
      roomVideoUrls: requestData.roomVideoUrls,
      compositionSettings: requestData.compositionSettings,
      webhookUrl: requestData.webhookUrl,
      webhookSecret: requestData.webhookSecret,
    };

    // Add job to queue
    await addVideoJob(videoJob);

    // Calculate estimated duration (rough estimate: 1 minute per room video)
    const estimatedDuration = requestData.roomVideoUrls.length * 60;

    // Get updated queue position
    const updatedStats = await getQueueStats();
    const queuePosition = updatedStats.waiting + updatedStats.active;

    const successResponse: VideoProcessResponse = {
      success: true,
      jobId: requestData.jobId,
      estimatedDuration,
      queuePosition,
    };

    logger.info(
      {
        jobId: requestData.jobId,
        projectId: requestData.projectId,
        userId: requestData.userId,
        roomCount: requestData.roomVideoUrls.length,
        queuePosition,
      },
      'Video processing job accepted'
    );

    // Return 202 Accepted (requirement 5.2)
    res.status(202).json(successResponse);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Failed to process video request'
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
 * GET /video/status/:jobId
 * Query the status of a video processing job
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

    // Get job from queue
    const job = await getJobStatus(jobId);

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
        'Job not found'
      );

      res.status(404).json(errorResponse);
      return;
    }

    // Determine job status
    let status: 'queued' | 'processing' | 'completed' | 'failed';
    let progress = 0;

    if (await job.isCompleted()) {
      status = 'completed';
      progress = 100;
    } else if (await job.isFailed()) {
      status = 'failed';
      progress = 0;
    } else if (await job.isActive()) {
      status = 'processing';
      // Progress is estimated based on job progress (0-100)
      progress = job.progress() as number || 50; // Default to 50% if no progress reported
    } else {
      status = 'queued';
      progress = 0;
    }

    const response: JobStatusResponse = {
      jobId,
      status,
      progress,
    };

    // Add error if job failed
    if (status === 'failed' && job.failedReason) {
      response.error = job.failedReason;
    }

    // Add result if job completed
    if (status === 'completed' && job.returnvalue) {
      response.result = {
        videoUrl: job.returnvalue.videoUrl,
        thumbnailUrl: job.returnvalue.thumbnailUrl,
        duration: job.returnvalue.duration,
      };
    }

    logger.debug(
      {
        jobId,
        status,
        progress,
      },
      'Job status queried'
    );

    res.status(200).json(response);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        jobId: req.params.jobId,
      },
      'Failed to get job status'
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
