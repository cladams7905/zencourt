import { nanoid } from "nanoid";
import { and, eq, isNotNull, isNull } from "drizzle-orm";
import { db, videos } from "@db/client";

interface ArchiveOptions {
  label?: string;
}

export interface ArchiveRoomVideosResult {
  archivedCount: number;
  batchId: string | null;
  label: string | null;
}

/**
 * Archive (version) all non-final room videos for a project by tagging them
 * with a batch identifier instead of deleting the records outright.
 */
export async function archiveRoomVideosForProject(
  projectId: string,
  options?: ArchiveOptions
): Promise<ArchiveRoomVideosResult> {
  const activeRoomVideos = await db
    .select({ id: videos.id })
    .from(videos)
    .where(
      and(
        eq(videos.projectId, projectId),
        isNotNull(videos.roomId),
        isNull(videos.archivedAt)
      )
    );

  if (activeRoomVideos.length === 0) {
    return {
      archivedCount: 0,
      batchId: null,
      label: null
    };
  }

  const archivedAt = new Date();
  const batchId = nanoid();
  const label =
    options?.label?.trim() ||
    `Version ${archivedAt.toISOString().replace("T", " ").split(".")[0]}`;

  const updatedRows = await db
    .update(videos)
    .set({
      archivedAt,
      archiveBatchId: batchId,
      archiveLabel: label,
      updatedAt: archivedAt
    })
    .where(
      and(
        eq(videos.projectId, projectId),
        isNotNull(videos.roomId),
        isNull(videos.archivedAt)
      )
    )
    .returning({ id: videos.id });

  return {
    archivedCount: updatedRows.length,
    batchId,
    label
  };
}
