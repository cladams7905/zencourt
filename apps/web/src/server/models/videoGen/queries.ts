"use server";

import {
  and,
  asc,
  db,
  desc,
  eq,
  videoGenBatch,
  videoClipVersions,
  videoClips,
  videoGenJobs
} from "@db/client";
import type {
  DBVideoClip,
  DBVideoClipVersion,
  DBVideoGenBatch,
  DBVideoGenJob
} from "@db/types/models";
import { requireNonEmptyString } from "../shared/validation";
import { withDbErrorHandling } from "../shared/dbErrorHandling";

export async function getVideoGenJobById(
  jobId: string
): Promise<DBVideoGenJob | null> {
  requireNonEmptyString(jobId, "jobId is required");

  return withDbErrorHandling(
    async () => {
      const [job] = await db
        .select()
        .from(videoGenJobs)
        .where(eq(videoGenJobs.id, jobId))
        .limit(1);

      return job ?? null;
    },
    {
      actionName: "getVideoGenJobById",
      context: { jobId },
      errorMessage: "Failed to load video generation job. Please try again."
    }
  );
}

export async function getVideoGenBatchById(
  batchId: string
): Promise<DBVideoGenBatch | null> {
  requireNonEmptyString(batchId, "batchId is required");

  return withDbErrorHandling(
    async () => {
      const [batch] = await db
        .select()
        .from(videoGenBatch)
        .where(eq(videoGenBatch.id, batchId))
        .limit(1);

      return batch ?? null;
    },
    {
      actionName: "getVideoGenBatchById",
      context: { batchId },
      errorMessage: "Failed to load video generation batch. Please try again."
    }
  );
}

export async function getLatestVideoGenBatchByListingId(
  listingId: string
): Promise<DBVideoGenBatch | null> {
  requireNonEmptyString(listingId, "listingId is required");

  return withDbErrorHandling(
    async () => {
      const [batch] = await db
        .select()
        .from(videoGenBatch)
        .where(eq(videoGenBatch.listingId, listingId))
        .orderBy(desc(videoGenBatch.createdAt))
        .limit(1);

      return batch ?? null;
    },
    {
      actionName: "getLatestVideoGenBatchByListingId",
      context: { listingId },
      errorMessage: "Failed to load latest video generation batch. Please try again."
    }
  );
}

export async function getVideoClipById(
  videoClipId: string
): Promise<DBVideoClip | null> {
  requireNonEmptyString(videoClipId, "videoClipId is required");

  return withDbErrorHandling(
    async () => {
      const [videoClip] = await db
        .select()
        .from(videoClips)
        .where(eq(videoClips.id, videoClipId))
        .limit(1);

      return videoClip ?? null;
    },
    {
      actionName: "getVideoClipById",
      context: { videoClipId },
      errorMessage: "Failed to load video clip. Please try again."
    }
  );
}

export async function getVideoClipVersionById(
  clipVersionId: string
): Promise<DBVideoClipVersion | null> {
  requireNonEmptyString(clipVersionId, "clipVersionId is required");

  return withDbErrorHandling(
    async () => {
      const [clipVersion] = await db
        .select()
        .from(videoClipVersions)
        .where(eq(videoClipVersions.id, clipVersionId))
        .limit(1);

      return clipVersion ?? null;
    },
    {
      actionName: "getVideoClipVersionById",
      context: { clipVersionId },
      errorMessage: "Failed to load video clip version. Please try again."
    }
  );
}

export async function getCurrentVideoClipVersionsByListingId(
  listingId: string
): Promise<DBVideoClipVersion[]> {
  requireNonEmptyString(listingId, "listingId is required");

  return withDbErrorHandling(
    async () => {
      const rows = await db
        .select({
          clipVersion: videoClipVersions
        })
        .from(videoClips)
        .innerJoin(
          videoClipVersions,
          eq(videoClipVersions.id, videoClips.currentVideoClipVersionId)
        )
        .where(eq(videoClips.listingId, listingId))
        .orderBy(asc(videoClips.sortOrder), asc(videoClips.createdAt));

      return rows.map(({ clipVersion }) => clipVersion);
    },
    {
      actionName: "getCurrentVideoClipVersionsByListingId",
      context: { listingId },
      errorMessage: "Failed to load current video clip versions. Please try again."
    }
  );
}

export async function getVideoClipVersionBySourceVideoGenJobId(
  sourceVideoGenJobId: string
): Promise<DBVideoClipVersion | null> {
  requireNonEmptyString(
    sourceVideoGenJobId,
    "sourceVideoGenJobId is required"
  );

  return withDbErrorHandling(
    async () => {
      const [clipVersion] = await db
        .select()
        .from(videoClipVersions)
        .where(eq(videoClipVersions.sourceVideoGenJobId, sourceVideoGenJobId))
        .limit(1);

      return clipVersion ?? null;
    },
    {
      actionName: "getVideoClipVersionBySourceVideoGenJobId",
      context: { sourceVideoGenJobId },
      errorMessage: "Failed to load video clip version. Please try again."
    }
  );
}

export async function getSuccessfulVideoClipVersionsByClipId(
  clipId: string
): Promise<DBVideoClipVersion[]> {
  requireNonEmptyString(clipId, "clipId is required");

  return withDbErrorHandling(
    async () => {
      return await db
        .select()
        .from(videoClipVersions)
        .where(
          and(
            eq(videoClipVersions.videoClipId, clipId),
            eq(videoClipVersions.status, "completed")
          )
        )
        .orderBy(
          desc(videoClipVersions.versionNumber),
          desc(videoClipVersions.createdAt)
        );
    },
    {
      actionName: "getSuccessfulVideoClipVersionsByClipId",
      context: { clipId },
      errorMessage: "Failed to load video clip version history. Please try again."
    }
  );
}

export async function getLatestVideoClipVersionByClipId(
  clipId: string
): Promise<DBVideoClipVersion | null> {
  requireNonEmptyString(clipId, "clipId is required");

  return withDbErrorHandling(
    async () => {
      const [clipVersion] = await db
        .select()
        .from(videoClipVersions)
        .where(eq(videoClipVersions.videoClipId, clipId))
        .orderBy(
          desc(videoClipVersions.versionNumber),
          desc(videoClipVersions.createdAt)
        )
        .limit(1);

      return clipVersion ?? null;
    },
    {
      actionName: "getLatestVideoClipVersionByClipId",
      context: { clipId },
      errorMessage: "Failed to load latest video clip version. Please try again."
    }
  );
}
