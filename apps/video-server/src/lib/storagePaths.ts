/**
 * Storage path helpers shared across upload + webhook flows.
 */

function sanitizeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Build the user/project-scoped S3 key that mirrors the structure used by the
 * Vercel app so assets stay co-located.
 */
export function buildUserProjectVideoKey(
  userId: string,
  projectId: string,
  filename: string,
  videoId?: string
): string {
  const safeUserId = sanitizeSegment(userId);
  const safeProjectId = sanitizeSegment(projectId);
  const safeFilename = sanitizeSegment(filename);
  const videoSegment = videoId ? `/videos/video_${sanitizeSegment(videoId)}` : '';

  return `user_${safeUserId}/projects/project_${safeProjectId}${videoSegment}/${safeFilename}`;
}

/**
 * Generic fallback path used when user/project context is unavailable.
 */
export function buildGenericUploadKey(folder: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 10);
  const safeFolder = sanitizeSegment(folder);
  const safeFilename = sanitizeSegment(filename);

  return `${safeFolder}/${timestamp}-${random}/${safeFilename}`;
}
