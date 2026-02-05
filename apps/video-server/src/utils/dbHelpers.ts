/**
 * Centralized database utilities for video server.
 * Provides CRUD operations for videoGenBatch and videoGenJobs tables.
 */

import {
  db,
  videoGenBatch,
  videoGenJobs,
  eq,
  and,
  inArray
} from "@db/client";
import type { VideoStatus } from "@shared/types/models";

// ============================================
// Video Generation Cancel Operations
// ============================================

const CANCELABLE_STATUSES: VideoStatus[] = ["pending", "processing"];

function resolveCancelReason(reason?: string): string {
  return reason?.trim() || "Canceled by user request";
}

/**
 * Cancel video generation batches by listing ID.
 * Returns the number of batches canceled.
 */
export async function cancelVideosByListing(
  listingId: string,
  reason?: string
): Promise<number> {
  const canceled = await db
    .update(videoGenBatch)
    .set({
      status: "canceled",
      errorMessage: resolveCancelReason(reason),
      updatedAt: new Date()
    })
    .where(
      and(
        eq(videoGenBatch.listingId, listingId),
        inArray(videoGenBatch.status, CANCELABLE_STATUSES)
      )
    )
    .returning({ id: videoGenBatch.id });

  return canceled.length;
}

/**
 * Cancel video generation batches by batch IDs.
 * Returns the number of batches canceled.
 */
export async function cancelVideosByIds(
  videoIds: string[],
  reason?: string
): Promise<number> {
  if (videoIds.length === 0) return 0;

  const canceled = await db
    .update(videoGenBatch)
    .set({
      status: "canceled",
      errorMessage: resolveCancelReason(reason),
      updatedAt: new Date()
    })
    .where(
      and(
        inArray(videoGenBatch.id, videoIds),
        inArray(videoGenBatch.status, CANCELABLE_STATUSES)
      )
    )
    .returning({ id: videoGenBatch.id });

  return canceled.length;
}

/**
 * Cancel video generation jobs by listing ID.
 * Returns the number of jobs canceled.
 */
export async function cancelJobsByListingId(
  listingId: string,
  reason?: string
): Promise<number> {
  // First, find all video batches belonging to this listing
  const listingVideos = await db
    .select({ id: videoGenBatch.id })
    .from(videoGenBatch)
    .where(eq(videoGenBatch.listingId, listingId));

  if (listingVideos.length === 0) return 0;

  const videoIds = listingVideos.map((v) => v.id);

  // Cancel all jobs for those batches
  const canceled = await db
    .update(videoGenJobs)
    .set({
      status: "canceled",
      errorMessage: resolveCancelReason(reason),
      updatedAt: new Date()
    })
    .where(
      and(
        inArray(videoGenJobs.videoGenBatchId, videoIds),
        inArray(videoGenJobs.status, CANCELABLE_STATUSES)
      )
    )
    .returning({ id: videoGenJobs.id });

  return canceled.length;
}
