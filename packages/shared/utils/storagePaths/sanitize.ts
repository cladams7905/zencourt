/**
 * Storage-safe segment sanitizer for identifiers (user/project/video IDs, folders, etc.)
 * Keeps casing intact while removing unsupported characters for storage keys.
 */
export function sanitizePathSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Sanitize filename for storage.
 * Removes special characters and ensures safe file names.
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/[^a-z0-9-_.]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}
