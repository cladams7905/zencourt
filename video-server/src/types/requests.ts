/**
 * Type definitions for API requests and responses
 */

export interface VideoCompositionSettings {
  transition?: 'fade' | 'crossfade' | 'slide' | 'zoom';
  transitionDuration?: number;
  videoDuration?: number;
  includeSubtitles?: boolean;
  includeWatermark?: boolean;
  watermarkPosition?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  outputFormat?: 'mp4' | 'webm';
  outputQuality?: 'low' | 'medium' | 'high';
}

export interface VideoProcessRequest {
  jobId: string;
  projectId: string;
  userId: string;
  roomVideoUrls: string[];
  compositionSettings: VideoCompositionSettings;
  webhookUrl: string;
  webhookSecret: string;
}

export interface VideoProcessResponse {
  success: boolean;
  jobId: string;
  estimatedDuration: number; // seconds
  queuePosition: number;
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  checks: {
    ffmpeg: boolean;
    s3: boolean;
    redis: boolean;
  };
  queueStats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
}

export interface JobStatusResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  result?: {
    videoUrl: string;
    thumbnailUrl: string;
    duration: number;
  };
}

export interface WebhookPayload {
  jobId: string;
  projectId: string;
  status: 'completed' | 'failed';
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  code?: string;
  details?: unknown;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  data?: T;
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;
