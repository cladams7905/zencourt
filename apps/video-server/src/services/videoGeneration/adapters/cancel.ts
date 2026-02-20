import {
  and,
  db,
  eq,
  inArray,
  videoGenBatch,
  videoGenJobs
} from "@db/client";
import type { VideoStatus } from "@db/types/models";

const CANCELABLE_STATUSES: VideoStatus[] = ["pending", "processing"];

function resolveCancelReason(reason?: string): string {
  return reason?.trim() || "Canceled by user request";
}

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

export async function cancelJobsByListingId(
  listingId: string,
  reason?: string
): Promise<number> {
  const listingVideos = await db
    .select({ id: videoGenBatch.id })
    .from(videoGenBatch)
    .where(eq(videoGenBatch.listingId, listingId));

  if (listingVideos.length === 0) return 0;

  const videoIds = listingVideos.map((video) => video.id);

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
