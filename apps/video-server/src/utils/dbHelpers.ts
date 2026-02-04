/**
 * Centralized database utilities for video server.
 * Provides CRUD operations for videoRenderJobs, videoContent, and videoContentJobs tables.
 */

import { nanoid } from "nanoid";
import {
  db,
  videoRenderJobs,
  videoContent,
  videoContentJobs,
  content,
  eq,
  and,
  exists,
  inArray
} from "@db/client";
import type { VideoStatus } from "@shared/types/models";

/**
 * Create a render job record in the database.
 * Returns the generated render job ID.
 */
export async function createRenderJobRecord(
  videoId: string,
  renderJobId?: string
): Promise<string> {
  const id = renderJobId ?? nanoid();

  await db.insert(videoRenderJobs).values({
    id,
    videoContentId: videoId,
    status: "pending",
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  return id;
}

/**
 * Update render job status to processing.
 */
export async function markRenderJobProcessing(renderJobId: string): Promise<void> {
  await db
    .update(videoRenderJobs)
    .set({
      status: "processing",
      progress: 0,
      startedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(videoRenderJobs.id, renderJobId));
}

/**
 * Update render job progress.
 */
export async function updateRenderJobProgress(
  renderJobId: string,
  progress: number
): Promise<void> {
  await db
    .update(videoRenderJobs)
    .set({
      progress: Math.round(progress * 100),
      updatedAt: new Date()
    })
    .where(eq(videoRenderJobs.id, renderJobId));
}

/**
 * Mark render job as completed.
 */
export async function markRenderJobCompleted(
  renderJobId: string,
  videoUrl?: string,
  thumbnailUrl?: string
): Promise<void> {
  await db
    .update(videoRenderJobs)
    .set({
      status: "completed",
      progress: 100,
      videoUrl,
      thumbnailUrl,
      completedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(videoRenderJobs.id, renderJobId));
}

/**
 * Mark render job as failed.
 */
export async function markRenderJobFailed(
  renderJobId: string,
  errorMessage: string
): Promise<void> {
  await db
    .update(videoRenderJobs)
    .set({
      status: "failed",
      errorMessage,
      completedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(videoRenderJobs.id, renderJobId));
}

// ============================================
// Video Content Cancel Operations
// ============================================

const CANCELABLE_STATUSES: VideoStatus[] = ["pending", "processing"];

function resolveCancelReason(reason?: string): string {
  return reason?.trim() || "Canceled by user request";
}

/**
 * Cancel video content by listing ID.
 * Returns the number of videos canceled.
 */
export async function cancelVideosByListing(
  listingId: string,
  reason?: string
): Promise<number> {
  const canceled = await db
    .update(videoContent)
    .set({
      status: "canceled",
      errorMessage: resolveCancelReason(reason),
      updatedAt: new Date()
    })
    .where(
      and(
        exists(
          db
            .select({ id: content.id })
            .from(content)
            .where(
              and(
                eq(content.id, videoContent.contentId),
                eq(content.listingId, listingId)
              )
            )
        ),
        inArray(videoContent.status, CANCELABLE_STATUSES)
      )
    )
    .returning({ id: videoContent.id });

  return canceled.length;
}

/**
 * Cancel video content by video IDs.
 * Returns the number of videos canceled.
 */
export async function cancelVideosByIds(
  videoIds: string[],
  reason?: string
): Promise<number> {
  if (videoIds.length === 0) return 0;

  const canceled = await db
    .update(videoContent)
    .set({
      status: "canceled",
      errorMessage: resolveCancelReason(reason),
      updatedAt: new Date()
    })
    .where(
      and(
        inArray(videoContent.id, videoIds),
        inArray(videoContent.status, CANCELABLE_STATUSES)
      )
    )
    .returning({ id: videoContent.id });

  return canceled.length;
}

/**
 * Cancel video content jobs by listing ID.
 * Returns the number of jobs canceled.
 */
export async function cancelJobsByListingId(
  listingId: string,
  reason?: string
): Promise<number> {
  // First, find all video content belonging to this listing
  const listingVideos = await db
    .select({ id: videoContent.id })
    .from(videoContent)
    .innerJoin(content, eq(videoContent.contentId, content.id))
    .where(eq(content.listingId, listingId));

  if (listingVideos.length === 0) return 0;

  const videoIds = listingVideos.map((v) => v.id);

  // Cancel all jobs for those videos
  const canceled = await db
    .update(videoContentJobs)
    .set({
      status: "canceled",
      errorMessage: resolveCancelReason(reason),
      updatedAt: new Date()
    })
    .where(
      and(
        inArray(videoContentJobs.videoContentId, videoIds),
        inArray(videoContentJobs.status, CANCELABLE_STATUSES)
      )
    )
    .returning({ id: videoContentJobs.id });

  return canceled.length;
}
