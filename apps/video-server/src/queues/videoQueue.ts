/**
 * Video Processing Queue
 *
 * Bull queue for managing video processing jobs with Redis backend
 */

import Queue, { Job, JobOptions } from 'bull';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import {
  QueueError,
  QueueStats,
  VideoJob,
  VideoJobResult,
} from '@shared/types/video';
import { videoCompositionService } from '@/services/videoCompositionService';
import { webhookService } from '@/services/webhookService';
import { projectRepository } from '@/services/db/projectRepository';

// ============================================================================
// Queue Configuration
// ============================================================================

const queueOptions = {
  redis: {
    host: env.redisHost,
    port: env.redisPort,
    password: env.redisPassword,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential' as const,
      delay: 2000,
    },
    timeout: env.jobTimeoutMs, // 10 minutes default
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  } as JobOptions,
};

// ============================================================================
// Video Queue Instance
// ============================================================================

export const videoQueue = new Queue<VideoJob>('video-processing', queueOptions);

// ============================================================================
// Queue Processor
// ============================================================================

async function markProjectSuccess(projectId: string, result: VideoJobResult): Promise<void> {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    logger.warn({ projectId }, 'Project not found while marking success');
    return;
  }

  await projectRepository.markVideoCompleted({
    project,
    videoUrl: result.videoUrl,
    duration: result.duration,
    thumbnailUrl: result.thumbnailUrl,
    resolution: null,
    completedAt: new Date().toISOString(),
  });
}

async function markProjectFailure(projectId: string, errorMessage: string): Promise<void> {
  const project = await projectRepository.findById(projectId);
  if (!project) {
    logger.warn({ projectId }, 'Project not found while marking failure');
    return;
  }

  await projectRepository.markVideoFailed({
    project,
    errorMessage,
    errorType: 'PROCESSING_ERROR',
    retryable: true,
  });
}

/**
 * Process a video job: download videos, compose them, upload result
 */
async function processVideoJob(jobData: VideoJob): Promise<VideoJobResult> {
  const { jobId, userId, projectId, roomVideoUrls, compositionSettings, webhookUrl, webhookSecret } = jobData;

  logger.info({
    jobId,
    projectId,
    userId,
    roomCount: roomVideoUrls.length,
  }, 'Starting video job processing');

  try {
    // Use video composition service to combine room videos
    const result = await videoCompositionService.combineRoomVideos(
      roomVideoUrls,
      compositionSettings,
      userId,
      projectId,
      jobId, // Use jobId as finalVideoId
      projectId // Use projectId as projectName
    );

    logger.info({
      jobId,
      videoUrl: result.videoUrl,
      thumbnailUrl: result.thumbnailUrl,
      duration: result.duration,
      fileSize: result.fileSize,
    }, 'Video job completed successfully');

    await markProjectSuccess(projectId, result);

    // Send success webhook (handle gracefully - don't fail job if webhook fails)
    try {
      await webhookService.sendWebhook({
        url: webhookUrl,
        secret: webhookSecret,
        payload: {
          jobId,
          status: 'completed',
          timestamp: new Date().toISOString(),
          result: {
            videoUrl: result.videoUrl,
            thumbnailUrl: result.thumbnailUrl,
            duration: result.duration,
            fileSize: result.fileSize,
          },
        },
        maxRetries: env.webhookRetryAttempts,
        backoffMs: env.webhookRetryBackoffMs,
      });
    } catch (webhookError) {
      // Log webhook failure but don't fail the job (requirement 8.4)
      logger.error({
        jobId,
        error: webhookError instanceof Error ? webhookError.message : String(webhookError),
      }, 'Failed to send success webhook - job completed but notification failed');
    }

    return result;
  } catch (error) {
    logger.error({
      jobId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Video job processing failed');

    await markProjectFailure(projectId, error instanceof Error ? error.message : 'Unknown error');

    // Send failure webhook
    try {
      await webhookService.sendWebhook({
        url: webhookUrl,
        secret: webhookSecret,
        payload: {
          jobId,
          status: 'failed',
          timestamp: new Date().toISOString(),
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: error instanceof Error && 'code' in error ? String((error as any).code) : 'PROCESSING_ERROR',
          },
        },
        maxRetries: env.webhookRetryAttempts,
        backoffMs: env.webhookRetryBackoffMs,
      });
    } catch (webhookError) {
      logger.error({
        jobId,
        error: webhookError instanceof Error ? webhookError.message : String(webhookError),
      }, 'Failed to send failure webhook');
    }

    throw error;
  }
}

// Register queue processor with concurrency limit
videoQueue.process(env.maxConcurrentJobs, async (job: Job<VideoJob>) => {
  logger.info({
    jobId: job.data.jobId,
    bullJobId: job.id,
    attemptsMade: job.attemptsMade,
  }, 'Processing video job from queue');

  return processVideoJob(job.data);
});

// ============================================================================
// Queue Event Handlers
// ============================================================================

videoQueue.on('completed', (job: Job<VideoJob>, result: VideoJobResult) => {
  logger.info({
    jobId: job.data.jobId,
    bullJobId: job.id,
    duration: result.duration,
    fileSize: result.fileSize,
  }, 'Job completed');
});

videoQueue.on('failed', (job: Job<VideoJob>, error: Error) => {
  logger.error({
    jobId: job.data.jobId,
    bullJobId: job.id,
    attemptsMade: job.attemptsMade,
    error: error.message,
    stack: error.stack,
  }, 'Job failed');
});

videoQueue.on('stalled', (job: Job<VideoJob>) => {
  logger.warn({
    jobId: job.data.jobId,
    bullJobId: job.id,
  }, 'Job stalled');
});

videoQueue.on('error', (error: Error) => {
  logger.error({
    error: error.message,
    stack: error.stack,
  }, 'Queue error');
});

videoQueue.on('waiting', (jobId: string | number) => {
  logger.debug({
    bullJobId: jobId,
  }, 'Job waiting');
});

videoQueue.on('active', (job: Job<VideoJob>) => {
  logger.info({
    jobId: job.data.jobId,
    bullJobId: job.id,
  }, 'Job started processing');
});

// ============================================================================
// Queue Management Functions
// ============================================================================

/**
 * Add a video processing job to the queue
 */
export async function addVideoJob(jobData: VideoJob): Promise<Job<VideoJob>> {
  logger.info({
    jobId: jobData.jobId,
    projectId: jobData.projectId,
    roomCount: jobData.roomVideoUrls.length,
  }, 'Adding video job to queue');

  try {
    const job = await videoQueue.add(jobData, {
      jobId: jobData.jobId, // Use our jobId as the Bull job ID for easy lookup
    });

    logger.info({
      jobId: jobData.jobId,
      bullJobId: job.id,
    }, 'Video job added to queue');

    return job;
  } catch (error) {
    logger.error({
      jobId: jobData.jobId,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to add job to queue');

    throw new QueueError(
      `Failed to add job to queue: ${error instanceof Error ? error.message : String(error)}`,
      'REDIS_CONNECTION_ERROR',
      error
    );
  }
}

/**
 * Get job status by jobId
 */
export async function getJobStatus(jobId: string): Promise<Job<VideoJob> | null> {
  try {
    const job = await videoQueue.getJob(jobId);
    return job;
  } catch (error) {
    logger.error({
      jobId,
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to get job status');

    throw new QueueError(
      `Failed to get job status: ${error instanceof Error ? error.message : String(error)}`,
      'REDIS_CONNECTION_ERROR',
      error
    );
  }
}

/**
 * Get queue statistics
 */
export async function getQueueStats(): Promise<QueueStats> {
  try {
    const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
      videoQueue.getWaitingCount(),
      videoQueue.getActiveCount(),
      videoQueue.getCompletedCount(),
      videoQueue.getFailedCount(),
      videoQueue.getDelayedCount(),
      videoQueue.getPausedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused,
    };
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to get queue stats');

    throw new QueueError(
      `Failed to get queue stats: ${error instanceof Error ? error.message : String(error)}`,
      'REDIS_CONNECTION_ERROR',
      error
    );
  }
}

/**
 * Check if Redis connection is healthy
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    // Try to get queue stats as a health check
    await videoQueue.client.ping();
    return true;
  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : String(error),
    }, 'Redis health check failed');
    return false;
  }
}

/**
 * Gracefully close the queue connection
 * Pauses new jobs and waits for active jobs to complete
 */
export async function closeQueue(): Promise<void> {
  logger.info('Closing video queue...');

  // Pause queue to prevent accepting new jobs
  await videoQueue.pause();
  logger.info('Queue paused - no longer accepting new jobs');

  // Wait for active jobs to complete (with Bull's built-in wait)
  await videoQueue.close();
  logger.info('Video queue closed - all active jobs completed or timeout reached');
}
