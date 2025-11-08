import { Image } from "./schema";
import { RoomCategory, RoomClassification } from "./roomCategory";

/**
 * Processing status for images throughout the workflow
 */
export type ImageProcessingStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "analyzing"
  | "analyzed"
  | "error";

/**
 * Processing phase for tracking overall progress
 */
export type ProcessingPhase =
  | "uploading"
  | "analyzing"
  | "categorizing"
  | "complete"
  | "error";

/**
 * Unified image data structure used throughout the application
 * Combines file information, upload state, and AI analysis results
 */
export interface ProcessedImage
  extends Partial<Omit<Image, "id" | "project_id" | "uploaded_at">> {
  /** Unique identifier */
  id: string;
  /** Original file */
  file: File;
  /** Preview URL (data URL or object URL) */
  previewUrl: string;
  /** Uploaded file URL (set after upload) */
  uploadUrl?: string;
  /** AI classification result (set after analysis) */
  classification?: RoomClassification;
  /** Detailed scene description for video generation */
  sceneDescription?: string;
  /** Processing status */
  status: ImageProcessingStatus;
  /** Error message if failed */
  error?: string;
}

/**
 * Serializable image data for server actions
 * Excludes File objects and data URLs to stay under 1MB limit
 */
export interface SerializableImageData {
  id: string;
  filename: string;
  uploadUrl: string;
  classification?: {
    category: RoomCategory;
    confidence: number;
    features?: string[];
  };
  sceneDescription?: string;
  metadata?: ImageMetadata;
}

/**
 * Image file metadata extracted from File object
 */
export interface ImageMetadata {
  width: number;
  height: number;
  format: string;
  size: number;
  lastModified: number;
}

/**
 * Images grouped by category
 */
export interface CategorizedImages {
  [category: string]: ProcessedImage[];
}

/**
 * Progress update during processing
 */
export interface ProcessingProgress {
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
}

/**
 * Progress callback function type
 */
export type ProgressCallback = (progress: ProcessingProgress) => void;

/**
 * Result of calling the storage API (S3-backed)
 */
export interface UploadResult {
  id: string;
  url: string;
  status: "success" | "error";
  error?: string;
}

/**
 * Final processing result
 */
export interface ProcessingResult {
  /** All processed images */
  images: ProcessedImage[];
  /** Processing statistics */
  stats: {
    total: number;
    uploaded: number;
    analyzed: number;
    failed: number;
    successRate: number;
    avgConfidence: number;
    totalDuration: number;
  };
  /** Categorized images by room type */
  categorized: CategorizedImages;
}
