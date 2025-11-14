import { VideoStatus } from "../models";

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
}

// ============================================================================
// Kling API
// ============================================================================

export interface KlingApiResponse extends ApiResponse {
  video: {
    url: string;
    file_name: string;
    content_type: string;
    file_size: number;
  };
}

export interface KlingQueueResponse extends ApiResponse {
  request_id: string;
}

// ============================================================================
// S3 Storage
// ============================================================================

export interface S3UploadResponse extends ApiResponse {
  key: string | null;
  url: string | null;
}

export interface S3UploadBatchResponse extends ApiResponse {
  results: (S3UploadResponse & { filename: string })[];
}

// ============================================================================
// Video Generation
// ============================================================================

export interface RoomVideoSummary {
  id: string;
  roomId: string | null;
  roomName: string | null;
  status: string;
  videoUrl?: string | null;
  errorMessage?: string | null;
}

export interface RoomGenerationResponse extends ApiResponse {
  projectId: string;
  rooms: RoomVideoSummary[];
}

export interface RoomStatusResponse extends ApiResponse {
  projectId: string;
  rooms: RoomVideoSummary[];
}

export interface VideoStatusResponse {
  success: true;
  jobId: string;
  projectId: string;
  status: VideoStatus;
  progress?: number; // 0-100
  estimatedTimeRemaining?: number; // seconds
  result?: {
    videoUrl: string;
    thumbnailUrl?: string;
    duration: number;
    resolution?: {
      width: number;
      height: number;
    };
  };
  error?: {
    message: string;
    type: string;
    retryable: boolean;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VideoCompletePayload {
  jobId: string;
  projectId: string;
  userId: string;
  status: "completed" | "failed";
  timestamp: string;
  result?: {
    videoUrl: string;
    thumbnailUrl?: string;
    duration: number;
    resolution: {
      width: number;
      height: number;
    };
  };
  error?: {
    message: string;
    type: string;
    retryable: boolean;
  };
}
