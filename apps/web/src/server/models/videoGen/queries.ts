"use server";

import { and, asc, db, desc, eq, videoGenJobs, clipVersions } from "@db/client";
import type { DBClipVersion, DBVideoGenJob } from "@db/types/models";
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

export async function getClipVersionById(
  clipVersionId: string
): Promise<DBClipVersion | null> {
  requireNonEmptyString(clipVersionId, "clipVersionId is required");

  return withDbErrorHandling(
    async () => {
      const [clipVersion] = await db
        .select()
        .from(clipVersions)
        .where(eq(clipVersions.id, clipVersionId))
        .limit(1);

      return clipVersion ?? null;
    },
    {
      actionName: "getClipVersionById",
      context: { clipVersionId },
      errorMessage: "Failed to load clip version. Please try again."
    }
  );
}

export async function getCurrentClipVersionsByListingId(
  listingId: string
): Promise<DBClipVersion[]> {
  requireNonEmptyString(listingId, "listingId is required");

  return withDbErrorHandling(
    async () => {
      return await db
        .select()
        .from(clipVersions)
        .where(
          and(
            eq(clipVersions.listingId, listingId),
            eq(clipVersions.isCurrent, true)
          )
        )
        .orderBy(asc(clipVersions.sortOrder), asc(clipVersions.createdAt));
    },
    {
      actionName: "getCurrentClipVersionsByListingId",
      context: { listingId },
      errorMessage: "Failed to load clip versions. Please try again."
    }
  );
}

export async function getClipVersionBySourceVideoGenJobId(
  sourceVideoGenJobId: string
): Promise<DBClipVersion | null> {
  requireNonEmptyString(
    sourceVideoGenJobId,
    "sourceVideoGenJobId is required"
  );

  return withDbErrorHandling(
    async () => {
      const [clipVersion] = await db
        .select()
        .from(clipVersions)
        .where(eq(clipVersions.sourceVideoGenJobId, sourceVideoGenJobId))
        .limit(1);

      return clipVersion ?? null;
    },
    {
      actionName: "getClipVersionBySourceVideoGenJobId",
      context: { sourceVideoGenJobId },
      errorMessage: "Failed to load clip version. Please try again."
    }
  );
}

export async function getSuccessfulClipVersionsByClipId(
  clipId: string
): Promise<DBClipVersion[]> {
  requireNonEmptyString(clipId, "clipId is required");

  return withDbErrorHandling(
    async () => {
      const clipVersion = await getClipVersionById(clipId);
      if (!clipVersion) {
        return [];
      }

      return await db
        .select()
        .from(clipVersions)
        .where(
          and(
            eq(clipVersions.listingId, clipVersion.listingId),
            eq(clipVersions.clipId, clipVersion.clipId),
            eq(clipVersions.status, "completed")
          )
        )
        .orderBy(desc(clipVersions.versionNumber), desc(clipVersions.createdAt));
    },
    {
      actionName: "getSuccessfulClipVersionsByClipId",
      context: { clipId },
      errorMessage: "Failed to load clip version history. Please try again."
    }
  );
}
