import { sanitizeFilename, sanitizePathSegment } from "./sanitize";

/**
 * Get the folder path for room videos.
 * Format: user_{userId}/listings/listing_{listingId}/videos/video_{videoId}
 */
export function getRoomVideoFolder(
  userId: string,
  listingId: string,
  videoId: string
): string {
  if (!userId || !listingId || !videoId) {
    throw new Error(
      "User ID, Listing ID, and Video ID are required for video storage"
    );
  }
  return `user_${userId}/listings/listing_${listingId}/videos/video_${videoId}`;
}

/**
 * Get the folder path for a specific video job.
 */
export function getVideoJobFolder(
  userId: string,
  listingId: string,
  videoId: string,
  jobId: string
): string {
  if (!userId || !listingId || !videoId || !jobId) {
    throw new Error(
      "User ID, Listing ID, Video ID, and Job ID are required for job storage"
    );
  }
  return `${getRoomVideoFolder(userId, listingId, videoId)}/jobs/job_${jobId}`;
}

export function getVideoJobVideoPath(
  userId: string,
  listingId: string,
  videoId: string,
  jobId: string
): string {
  return `${getVideoJobFolder(userId, listingId, videoId, jobId)}/video.mp4`;
}

export function getVideoJobThumbnailPath(
  userId: string,
  listingId: string,
  videoId: string,
  jobId: string
): string {
  return `${getVideoJobFolder(userId, listingId, videoId, jobId)}/thumbnail.jpg`;
}

export function getRoomVideoPath(
  userId: string,
  listingId: string,
  videoId: string,
  roomName: string
): string {
  const timestamp = Date.now();
  const sanitized = sanitizeFilename(roomName);
  return `${getRoomVideoFolder(userId, listingId, videoId)}/room_${sanitized}_${timestamp}.mp4`;
}

export function getFinalVideoFolder(
  userId: string,
  listingId: string,
  videoId: string
): string {
  if (!userId || !listingId || !videoId) {
    throw new Error(
      "User ID, Listing ID, and Video ID are required for video storage"
    );
  }
  return `user_${userId}/listings/listing_${listingId}/videos/video_${videoId}`;
}

export function getFinalVideoPath(
  userId: string,
  listingId: string,
  videoId: string,
  listingName?: string
): string {
  const timestamp = Date.now();
  const filename = listingName
    ? `final_${sanitizeFilename(listingName)}_${timestamp}.mp4`
    : `final_${timestamp}.mp4`;
  return `${getFinalVideoFolder(userId, listingId, videoId)}/${filename}`;
}

export function getThumbnailPath(
  userId: string,
  listingId: string,
  videoId: string
): string {
  const timestamp = Date.now();
  return `${getFinalVideoFolder(userId, listingId, videoId)}/thumb_${timestamp}.jpg`;
}

export function getTempVideoFolder(
  userId: string,
  listingId: string,
  videoId: string
): string {
  if (!userId || !listingId || !videoId) {
    throw new Error(
      "User ID, Listing ID, and Video ID are required for temp storage"
    );
  }
  return `user_${userId}/listings/listing_${listingId}/videos/video_${videoId}/temp`;
}

/**
 * Build the user/listing-scoped storage key that mirrors the structure shared by
 * both the Vercel app and the video server so assets stay co-located.
 */
export function buildUserListingVideoKey(
  userId: string,
  listingId: string,
  filename: string,
  videoId?: string
): string {
  const safeUserId = sanitizePathSegment(userId);
  const safeListingId = sanitizePathSegment(listingId);
  const safeFilename = sanitizePathSegment(filename);
  const videoSegment = videoId
    ? `/videos/video_${sanitizePathSegment(videoId)}`
    : "";

  return `user_${safeUserId}/listings/listing_${safeListingId}${videoSegment}/${safeFilename}`;
}
