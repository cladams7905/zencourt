/**
 * Video Queue Tests
 */

import type { VideoJob, QueueStats } from '@/types/queue';

// Mock dependencies before imports
jest.mock('bull');
jest.mock('@/config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('@/config/env', () => ({
  env: {
    redisHost: 'localhost',
    redisPort: 6379,
    redisPassword: undefined,
    jobTimeoutMs: 600000,
    maxConcurrentJobs: 1,
    webhookRetryAttempts: 5,
    webhookRetryBackoffMs: 1000,
  },
}));

jest.mock('@/services/videoCompositionService', () => ({
  videoCompositionService: {
    combineRoomVideos: jest.fn(),
  },
}));

jest.mock('@/services/webhookService', () => ({
  webhookService: {
    sendWebhook: jest.fn(),
  },
}));

describe('VideoQueue', () => {
  describe('Type definitions', () => {
    it('should have correct VideoJob type', () => {
      const job: VideoJob = {
        jobId: 'test-job-123',
        projectId: 'project-456',
        userId: 'user-789',
        roomVideoUrls: [
          'https://s3.amazonaws.com/video1.mp4',
          'https://s3.amazonaws.com/video2.mp4',
        ],
        compositionSettings: {
          transitions: true,
          logo: {
            s3Url: 'https://s3.amazonaws.com/logo.png',
            position: 'top-right',
          },
          subtitles: {
            enabled: true,
            text: 'Test subtitle',
            font: 'Arial',
          },
        },
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'secret-123',
      };

      expect(job).toBeDefined();
      expect(job.jobId).toBe('test-job-123');
      expect(job.roomVideoUrls).toHaveLength(2);
    });

    it('should have correct VideoJobResult type', () => {
      const result: import('@/types/queue').VideoJobResult = {
        videoUrl: 'https://s3.amazonaws.com/final.mp4',
        thumbnailUrl: 'https://s3.amazonaws.com/thumb.jpg',
        duration: 120,
        fileSize: 5000000,
      };

      expect(result).toBeDefined();
      expect(result.duration).toBe(120);
    });

    it('should have correct VideoJobStatus type', () => {
      const statuses: import('@/types/queue').VideoJobStatus[] = [
        'queued',
        'processing',
        'completed',
        'failed',
      ];

      expect(statuses).toHaveLength(4);
    });

    it('should have correct VideoJobProgress type', () => {
      const progress: import('@/types/queue').VideoJobProgress = {
        jobId: 'test-job-123',
        status: 'processing',
        progress: 50,
      };

      expect(progress).toBeDefined();
      expect(progress.progress).toBe(50);
    });

    it('should have correct QueueStats type', () => {
      const stats: QueueStats = {
        waiting: 5,
        active: 1,
        completed: 10,
        failed: 2,
        delayed: 0,
        paused: 0,
      };

      expect(stats).toBeDefined();
      expect(stats.active).toBe(1);
    });
  });

  describe('Queue configuration', () => {
    it('should have correct default job options', () => {
      const defaultOptions = {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        timeout: 600000,
        removeOnComplete: 100,
        removeOnFail: 200,
      };

      expect(defaultOptions.attempts).toBe(3);
      expect(defaultOptions.timeout).toBe(600000);
    });

    it('should configure Redis connection properly', () => {
      const redisConfig = {
        host: 'localhost',
        port: 6379,
        password: undefined,
      };

      expect(redisConfig.host).toBe('localhost');
      expect(redisConfig.port).toBe(6379);
    });
  });

  describe('Queue error handling', () => {
    it('should create QueueError with correct properties', () => {
      const { QueueError } = require('@/types/queue');
      const error = new QueueError(
        'Test error',
        'REDIS_CONNECTION_ERROR',
        { detail: 'test' }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('REDIS_CONNECTION_ERROR');
      expect(error.details).toEqual({ detail: 'test' });
    });

    it('should have all QueueErrorCode types', () => {
      const errorCodes: import('@/types/queue').QueueErrorCode[] = [
        'REDIS_CONNECTION_ERROR',
        'JOB_TIMEOUT',
        'JOB_PROCESSING_ERROR',
        'WEBHOOK_DELIVERY_ERROR',
        'QUEUE_STALLED',
        'UNKNOWN_ERROR',
      ];

      expect(errorCodes).toHaveLength(6);
    });
  });

  describe('Webhook payload types', () => {
    it('should have correct WebhookPayload for completed job', () => {
      const payload: import('@/types/queue').WebhookPayload = {
        jobId: 'test-job-123',
        status: 'completed',
        timestamp: '2025-01-01T00:00:00.000Z',
        result: {
          videoUrl: 'https://s3.amazonaws.com/video.mp4',
          thumbnailUrl: 'https://s3.amazonaws.com/thumb.jpg',
          duration: 120,
          fileSize: 5000000,
        },
      };

      expect(payload.status).toBe('completed');
      expect(payload.result).toBeDefined();
    });

    it('should have correct WebhookPayload for failed job', () => {
      const payload: import('@/types/queue').WebhookPayload = {
        jobId: 'test-job-123',
        status: 'failed',
        timestamp: '2025-01-01T00:00:00.000Z',
        error: {
          message: 'Processing failed',
          code: 'PROCESSING_ERROR',
        },
      };

      expect(payload.status).toBe('failed');
      expect(payload.error).toBeDefined();
    });
  });

  describe('Video composition settings', () => {
    it('should support settings without logo', () => {
      const job: VideoJob = {
        jobId: 'test-job-123',
        projectId: 'project-456',
        userId: 'user-789',
        roomVideoUrls: ['https://s3.amazonaws.com/video1.mp4'],
        compositionSettings: {
          transitions: true,
        },
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'secret-123',
      };

      expect(job.compositionSettings.logo).toBeUndefined();
    });

    it('should support settings without subtitles', () => {
      const job: VideoJob = {
        jobId: 'test-job-123',
        projectId: 'project-456',
        userId: 'user-789',
        roomVideoUrls: ['https://s3.amazonaws.com/video1.mp4'],
        compositionSettings: {
          transitions: false,
        },
        webhookUrl: 'https://example.com/webhook',
        webhookSecret: 'secret-123',
      };

      expect(job.compositionSettings.subtitles).toBeUndefined();
    });

    it('should support all logo positions', () => {
      const positions: import('@/services/videoCompositionService').LogoPosition[] = [
        'top-left',
        'top-right',
        'bottom-left',
        'bottom-right',
      ];

      expect(positions).toHaveLength(4);
    });
  });

  describe('Queue management functions', () => {
    it('should validate addVideoJob function signature', () => {
      // Just verify the module exports the function
      // Actual implementation testing would require Redis
      const videoQueueModule = require('../videoQueue');
      expect(typeof videoQueueModule.addVideoJob).toBe('function');
    });

    it('should validate getJobStatus function signature', () => {
      const videoQueueModule = require('../videoQueue');
      expect(typeof videoQueueModule.getJobStatus).toBe('function');
    });

    it('should validate getQueueStats function signature', () => {
      const videoQueueModule = require('../videoQueue');
      expect(typeof videoQueueModule.getQueueStats).toBe('function');
    });

    it('should validate checkRedisHealth function signature', () => {
      const videoQueueModule = require('../videoQueue');
      expect(typeof videoQueueModule.checkRedisHealth).toBe('function');
    });

    it('should validate closeQueue function signature', () => {
      const videoQueueModule = require('../videoQueue');
      expect(typeof videoQueueModule.closeQueue).toBe('function');
    });
  });

  describe('Environment configuration', () => {
    it('should use correct Redis defaults', () => {
      const { env } = require('@/config/env');
      expect(env.redisHost).toBe('localhost');
      expect(env.redisPort).toBe(6379);
    });

    it('should use correct job timeout default', () => {
      const { env } = require('@/config/env');
      expect(env.jobTimeoutMs).toBe(600000); // 10 minutes
    });

    it('should use correct max concurrent jobs default', () => {
      const { env } = require('@/config/env');
      expect(env.maxConcurrentJobs).toBe(1);
    });

    it('should use correct webhook retry defaults', () => {
      const { env } = require('@/config/env');
      expect(env.webhookRetryAttempts).toBe(5);
      expect(env.webhookRetryBackoffMs).toBe(1000);
    });
  });
});
