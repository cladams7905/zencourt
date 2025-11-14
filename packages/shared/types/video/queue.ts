/**
 * Queue Types
 *
 * Type definitions for Bull queue jobs and webhook delivery
 */

import type { VideoCompositionSettings } from "./composition";

// ============================================================================
// Video Processing Job Types
// ============================================================================

export interface VideoJob {
  jobId: string;
  projectId: string;
  userId: string;
  roomVideoUrls: string[];
  compositionSettings: VideoCompositionSettings;
  webhookUrl: string;
  webhookSecret: string;
}

export interface VideoJobResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
}

export type VideoJobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface VideoJobProgress {
  jobId: string;
  status: VideoJobStatus;
  progress: number; // 0-100
  error?: string;
  result?: VideoJobResult;
}

// ============================================================================
// Queue Statistics Types
// ============================================================================

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
}

// ============================================================================
// Webhook Delivery Types
// ============================================================================

export interface WebhookPayload {
  jobId: string;
  status: 'completed' | 'failed';
  timestamp: string;
  result?: VideoJobResult;
  error?: {
    message: string;
    code: string;
  };
}

export interface WebhookDeliveryOptions {
  url: string;
  secret: string;
  payload: WebhookPayload;
  maxRetries?: number;
  backoffMs?: number;
}

// ============================================================================
// Queue Error Types
// ============================================================================

export type QueueErrorCode =
  | 'REDIS_CONNECTION_ERROR'
  | 'JOB_TIMEOUT'
  | 'JOB_PROCESSING_ERROR'
  | 'WEBHOOK_DELIVERY_ERROR'
  | 'QUEUE_STALLED'
  | 'UNKNOWN_ERROR';

export class QueueError extends Error {
  constructor(
    message: string,
    public code: QueueErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'QueueError';
  }
}
