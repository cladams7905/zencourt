/**
 * Video Generation Types
 *
 * Type definitions for the Kling API video generation service
 */

// ============================================================================
// Kling API Types
// ============================================================================

export interface KlingApiRequest {
  prompt: string;
  input_image_urls: string[]; // Array of image URLs (up to 4 for elements endpoint)
  duration?: "5" | "10";
  aspect_ratio?: "16:9" | "9:16" | "1:1";
  negative_prompt?: string;
}

export interface KlingApiResponse {
  video: {
    url: string;
    file_name: string;
    content_type: string;
    file_size: number;
  };
}

export interface KlingQueueResponse {
  request_id: string;
}

export interface KlingApiError {
  error: string;
  message: string;
  code?: string;
  status?: number;
}

// ============================================================================
// Room Video Generation Types
// ============================================================================

export interface RoomVideoRequest {
  roomId: string;
  roomName: string;
  roomType: string;
  images: string[]; // Image URLs
  sceneDescriptions?: string[]; // Detailed scene descriptions from OpenAI vision for each image
  settings: {
    duration: "5" | "10";
    aspectRatio: "16:9" | "9:16" | "1:1";
    aiDirections: string;
  };
}

export interface RoomVideoResult {
  roomId: string;
  roomName: string;
  videoUrl: string;
  thumbnailUrl?: string;
  duration: number;
  status: "completed" | "failed" | "processing";
  error?: string;
}

// ============================================================================
// Video Composition Types
// ============================================================================

export type LogoPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export interface VideoCompositionSettings {
  roomVideos: Array<{
    url: string;
    roomName: string;
    order: number;
  }>;
  logo?: {
    file: File | Blob;
    position: LogoPosition;
  };
  subtitles?: {
    enabled: boolean;
    text: string;
    font: string;
  };
  transitions: boolean;
  outputFormat: {
    aspectRatio: "16:9" | "9:16" | "1:1";
  };
}

export interface ComposedVideoResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  fileSize: number;
}

export interface SubtitleData {
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}

// ============================================================================
// Video Generation Job Types
// ============================================================================

export type VideoGenerationStatus =
  | "pending"
  | "processing_rooms"
  | "composing_video"
  | "completed"
  | "failed";

export interface VideoGenerationJob {
  id: string;
  projectId: string;
  status: VideoGenerationStatus;
  totalRooms: number;
  completedRooms: number;
  failedRooms: string[];
  roomVideos: RoomVideoResult[];
  finalVideo?: ComposedVideoResult;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

export type VideoProgressStepType = "room_video" | "composition" | "upload";

export type VideoProgressStepStatus =
  | "waiting"
  | "in-progress"
  | "completed"
  | "failed";

export interface VideoProgressStep {
  id: string;
  type: VideoProgressStepType;
  label: string;
  status: VideoProgressStepStatus;
  progress?: number; // 0-100 for in-progress
  duration?: number; // actual duration in seconds for completed
  error?: string;
}

export interface VideoGenerationProgress {
  status: VideoGenerationStatus;
  currentStep: string;
  totalSteps: number;
  completedSteps: number;
  overallProgress: number; // 0-100
  steps: VideoProgressStep[];
  estimatedTimeRemaining: number; // in seconds
}

// ============================================================================
// Database Schema Types
// ============================================================================

export type VideoStatus = "pending" | "processing" | "completed" | "failed";

export interface Video {
  id: string;
  projectId: string;
  roomId: string | null;
  roomName: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number;
  status: VideoStatus;
  generationSettings: Record<string, unknown> | null;
  falRequestId: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoParams {
  projectId: string;
  roomId?: string | null;
  roomName?: string | null;
  videoUrl: string;
  duration: number;
  status: VideoStatus;
  generationSettings?: Record<string, unknown>;
}

export interface UpdateVideoParams {
  videoUrl?: string;
  thumbnailUrl?: string | null;
  duration?: number;
  status?: VideoStatus;
  generationSettings?: Record<string, unknown>;
  errorMessage?: string | null;
}

// ============================================================================
// Service Configuration Types
// ============================================================================

export interface KlingServiceConfig {
  apiKey: string;
  maxRetries: number;
  timeoutMs: number;
  concurrentRequests: number;
}

export interface RetryOptions {
  maxAttempts: number;
  backoffMs: number;
  backoffType: "exponential" | "linear";
}

export interface VideoStorageConfig {
  userId: string;
  projectId: string;
  videoId: string; // Video record ID for folder structure
  roomId?: string;
}

// ============================================================================
// Helper Types
// ============================================================================

export interface ImageSelectionResult {
  selectedUrls: string[];
  totalImages: number;
  confidenceScores: number[];
}

export interface PromptBuilderContext {
  roomName: string;
  roomType: string;
  aiDirections: string;
  imageCount: number;
  sceneDescriptions?: string[]; // Detailed descriptions from OpenAI vision for each image
}

// ============================================================================
// Error Types
// ============================================================================

export type VideoGenerationErrorCode =
  | "KLING_API_ERROR"
  | "KLING_RATE_LIMIT"
  | "KLING_TIMEOUT"
  | "STORAGE_ERROR"
  | "COMPOSITION_ERROR"
  | "DATABASE_ERROR"
  | "VALIDATION_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export class VideoGenerationError extends Error {
  constructor(
    message: string,
    public code: VideoGenerationErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = "VideoGenerationError";
  }
}
