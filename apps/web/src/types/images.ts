import { DBImage } from "@shared/types/models";

/**
 * Image during client-side processing workflow
 * Extends DBImage with runtime-only fields needed for upload/analysis
 *
 * Runtime fields (not persisted):
 * - file: Actual File object from user upload
 * - previewUrl: Temporary data/object URL for preview
 * - status: Current processing state
 * - error: Runtime error message if processing failed
 */
export type ProcessedImage = Partial<Omit<DBImage, "uploadedAt">> & {
  /** Unique identifier - required */
  id: string;
  /** Original file object - needed for upload and processing */
  file: File;
  /** Preview URL (data URL or object URL) - for immediate display */
  previewUrl: string;
  /** Processing status - tracks image through workflow */
  status: ImageProcessingStatus;
  /** Error message if processing failed */
  error?: string;
  /** Direct S3 URL once uploaded (alias for DB url) */
  uploadUrl?: string;
};

/**
 * Processing status for images throughout the workflow
 */
type ImageProcessingStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "error";

/**
 * Progress update during image processing
 */
export type ProcessingProgress = {
  /** Current processing phase */
  phase: ProcessingPhase;
  /** Number of completed items in current phase */
  completed: number;
  /** Total items in current phase */
  total: number;
  /** Overall progress percentage (0-100) */
  overallProgress: number;
  /** Current image being processed (optional) */
  currentImage?: ProcessedImage;
};

/**
 * Processing phase for tracking overall progress
 */
export type ProcessingPhase =
  | "uploading"
  | "analyzing"
  | "categorizing"
  | "complete"
  | "error";
