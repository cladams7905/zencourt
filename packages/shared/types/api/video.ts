/**
 * Type definitions for API requests and responses
 */

import type { VideoCompositionSettings } from "../video/composition";
import type { KlingDuration } from "./requests";

export type { VideoCompositionSettings };
export type { KlingDuration };
export type KlingAspectRatio = "16:9" | "9:16" | "1:1";

export interface RoomVideoGenerateRequest {
  jobId?: string;
  videoId: string;
  projectId: string;
  userId: string;
  roomId: string;
  roomName?: string;
  roomType?: string;
  prompt: string;
  imageUrls: string[];
  duration?: KlingDuration;
  aspectRatio?: KlingAspectRatio;
  metadata?: Record<string, unknown>;
}

export interface RoomVideoGenerateResponse {
  success: boolean;
  requestId: string;
  videoId: string;
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
  status: "healthy" | "unhealthy";
  timestamp: string;
  checks: {
    ffmpeg: boolean;
    s3: boolean;
  };
}

export interface JobStatusResponse {
  jobId: string;
  status: "queued" | "processing" | "completed" | "failed";
  progress: number; // 0-100
  error?: string;
  result?: {
    videoUrl: string;
    thumbnailUrl?: string;
    duration: number;
  };
}

export interface WebhookPayload {
  jobId: string;
  projectId: string;
  status: "completed" | "failed";
  videoUrl?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
  timestamp: string;
}

export interface FalWebhookPayload {
  request_id: string;
  status: "OK" | "ERROR";
  payload?: {
    video?: {
      url: string;
      file_size?: number;
      content_type?: string;
      metadata?: {
        duration?: number;
      };
    };
  };
  error?: string;
}

export interface CancelVideoRequest {
  projectId: string;
  videoIds?: string[];
  reason?: string;
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
