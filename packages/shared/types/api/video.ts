import type { PreviewTextOverlay } from "../video";

export type KlingAspectRatio = "16:9" | "9:16" | "1:1";

export interface VideoJobResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  fileSize?: number;
  metadata?: Record<string, unknown>;
  resolution?: {
    width: number;
    height: number;
  };
}

export interface VideoJobError {
  message: string;
  type?: string;
  code?: string;
  retryable?: boolean;
}

export type VideoJobWebhookStatus = "completed" | "failed";

export interface VideoJobWebhookPayload {
  jobId: string;
  videoId?: string;
  listingId: string;
  userId?: string;
  status: VideoJobWebhookStatus;
  timestamp: string;
  result?: VideoJobResult;
  error?: VideoJobError;
}

/**
 * Job-based video generation request for video server
 * Accepts parent videoId and array of jobIds to process
 */
export interface VideoServerGenerateRequest {
  videoId: string; // Parent video_assets ID
  jobIds: string[]; // Array of video_asset_jobs IDs to process
  listingId: string;
  userId: string;
  callbackUrl: string; // Full URL the video server POSTs job results to
}

export interface VideoServerRenderRequest {
  videoId: string;
  textOverlaysByJobId?: Record<string, PreviewTextOverlay>;
}

/**
 * Response from video server generation endpoint
 */
export interface VideoServerGenerateResponse {
  success: boolean;
  message: string;
  videoId: string;
  jobsStarted: number;
}

export interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  checks: {
    storage: boolean;
  };
}

export type WebhookPayload = VideoJobWebhookPayload;

export interface CancelVideoRequest {
  listingId: string;
  videoIds?: string[];
  reason?: string;
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
