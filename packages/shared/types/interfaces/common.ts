/**
 * Common Utility Types
 *
 * Shared utility types used across services
 */

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
