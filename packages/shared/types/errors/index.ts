/**
 * Error types that can occur during AI vision processing
 */
type AIVisionErrorCode =
  | "API_ERROR"
  | "TIMEOUT"
  | "INVALID_RESPONSE"
  | "RATE_LIMIT";

export class AIVisionError extends Error {
  constructor(
    message: string,
    public code: AIVisionErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = "AIVisionError";
  }
}

/**
 * Video Generation Error Types
 *
 * Error types and codes for video generation operations
 */

type VideoGenerationErrorCode =
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
