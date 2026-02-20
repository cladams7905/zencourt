import { sanitizePathSegment } from "./sanitize";

/**
 * Generic fallback path used when user/project context is unavailable.
 */
export function buildGenericUploadKey(folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  const safeFolder = sanitizePathSegment(folder);
  const safeFilename = sanitizePathSegment(filename);

  return `${safeFolder}/${timestamp}-${random}/${safeFilename}`;
}

/**
 * Generate a temporary listing ID.
 */
export function generateTempListingId(): string {
  return `temp-${Date.now()}`;
}
