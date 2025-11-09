/**
 * Video Generation Error Types
 *
 * Error types and codes for video generation operations
 */

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
