"use server";

import { db, eq, videoClipVersions, videoClips } from "@db/client";
import type {
  DBVideoClip,
  DBVideoClipVersion,
  InsertDBVideoClip,
  InsertDBVideoClipVersion
} from "@db/types/models";
import { requireNonEmptyString } from "../../shared/validation";
import { withDbErrorHandling } from "../../shared/dbErrorHandling";
import type { VideoClipUpdates, VideoClipVersionUpdates } from "./types";

export async function createVideoClip(videoClip: InsertDBVideoClip): Promise<void> {
  return withDbErrorHandling(
    async () => {
      await db.insert(videoClips).values(videoClip);
    },
    {
      actionName: "createVideoClip",
      context: { videoClipId: videoClip.id, listingId: videoClip.listingId },
      errorMessage: "Failed to create video clip. Please try again."
    }
  );
}

export async function updateVideoClip(
  videoClipId: string,
  updates: VideoClipUpdates
): Promise<DBVideoClip[]> {
  requireNonEmptyString(videoClipId, "videoClipId is required");

  return withDbErrorHandling(
    async () => {
      return await db
        .update(videoClips)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(videoClips.id, videoClipId))
        .returning();
    },
    {
      actionName: "updateVideoClip",
      context: { videoClipId },
      errorMessage: "Failed to update video clip. Please try again."
    }
  );
}

export async function createVideoClipVersion(
  clipVersion: InsertDBVideoClipVersion
): Promise<void> {
  return withDbErrorHandling(
    async () => {
      await db.insert(videoClipVersions).values(clipVersion);
    },
    {
      actionName: "createVideoClipVersion",
      context: {
        clipVersionId: clipVersion.id,
        videoClipId: clipVersion.videoClipId
      },
      errorMessage: "Failed to create video clip version. Please try again."
    }
  );
}

export async function updateVideoClipVersion(
  clipVersionId: string,
  updates: VideoClipVersionUpdates
): Promise<DBVideoClipVersion> {
  requireNonEmptyString(clipVersionId, "clipVersionId is required");

  return withDbErrorHandling(
    async () => {
      const [updated] = await db
        .update(videoClipVersions)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(videoClipVersions.id, clipVersionId))
        .returning();

      if (!updated) {
        throw new Error(`Clip version ${clipVersionId} not found`);
      }

      return updated;
    },
    {
      actionName: "updateVideoClipVersion",
      context: { clipVersionId },
      errorMessage: "Failed to update video clip version. Please try again."
    }
  );
}
