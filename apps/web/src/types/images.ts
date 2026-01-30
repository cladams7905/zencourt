import { DBListingImage, InsertDBListingImage } from "@shared/types/models";

/**
 * Data Flow Through Image Types
1. USER UPLOADS FILE
   └→ ProcessedImage created with File object
      { file: File, previewUrl: blob:..., status: "pending" }

2. UPLOAD TO STORAGE
   └→ toSerializable() → SerializableImageData
      Removes: file, previewUrl
   └→ Server Action processes upload
   └→ Returns with url populated
      { url: "https://storage...", status: "uploaded" }

3. AI ANALYSIS
   └→ toSerializable() → SerializableImageData
   └→ Server Action analyzes images
   └→ Returns with AI data populated
      { category: "bedroom", confidence: 0.95, features: [...] }

4. SAVE TO DATABASE
   └→ toInsertDBImage() → InsertDBImage
      { id, listingId, filename, url, category, confidence, features, ... }
   └→ Database insert
   └→ Returns DBImage with uploadedAt

5. LOAD FROM DATABASE
   └→ fromDBImage() → ProcessedImage
      Creates dummy File object, uses url as previewUrl
 */

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
export type ProcessedImage = Partial<Omit<DBListingImage, "uploadedAt">> & {
  /** Unique identifier - required */
  id: string;
  listingId?: string | null;
  /** Original file object - needed for upload and processing */
  file: File;
  /** Preview URL (data URL or object URL) - for immediate display */
  previewUrl: string;
  /** Processing status - tracks image through workflow */
  status: ImageProcessingStatus;
  /** Error message if processing failed */
  error?: string;
  /** Direct storage URL once uploaded (alias for DB url) */
  uploadUrl?: string;
};

/**
 * Serializable image data for server actions
 * ProcessedImage without non-serializable fields (File, blob URLs)
 * Safe to pass across client/server boundaries
 */
export type SerializableImageData = Omit<ProcessedImage, "file" | "previewUrl">;

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
  /** Current image being processed (optional) - can be either client or server format */
  currentImage?: ProcessedImage | SerializableImageData;
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

/**
 * Helper functions for type conversions
 */

/**
 * Convert ProcessedImage to serializable format for server actions
 * Removes non-serializable fields (File, blob URLs)
 */
export function toSerializable(image: ProcessedImage): SerializableImageData {
  return {
    id: image.id,
    listingId: image.listingId,
    url: image.url,
    filename: image.filename,
    category: image.category,
    confidence: image.confidence,
    primaryScore: image.primaryScore,
    features: image.features,
    sceneDescription: image.sceneDescription,
    status: image.status,
    isPrimary: image.isPrimary,
    metadata: image.metadata,
    error: image.error,
    uploadUrl: image.uploadUrl
  };
}

/**
 * Convert ProcessedImage to InsertDBImage for database operations
 */
export function toInsertDBImage(
  image: ProcessedImage,
  listingId: string
): InsertDBListingImage {
  return {
    id: image.id,
    listingId,
    filename: image.filename || image.file?.name || "image",
    url: image.url!,
    category: image.category ?? null,
    confidence: image.confidence ?? null,
    primaryScore: image.primaryScore ?? null,
    features: image.features ?? null,
    sceneDescription: image.sceneDescription ?? null,
    isPrimary: image.isPrimary ?? false,
    metadata: image.metadata ?? null
  };
}

/**
 * Convert DBImage to ProcessedImage for client workflow
 * Used when loading existing images from database
 */
export function fromDBImage(db: DBListingImage, file?: File): ProcessedImage {
  return {
    ...db,
    listingId: db.listingId,
    file: file ?? new File([], db.filename, { type: "image/jpeg" }),
    previewUrl: db.url,
    status: "analyzed" as const
  };
}
