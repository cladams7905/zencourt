import { and, eq, inArray } from "drizzle-orm";
import { db, videoAssets as videos, assets } from "@db/client";
import type { VideoStatus } from "@shared/types/models";

export type DbVideo = typeof videos.$inferSelect;

class VideoRepository {
  private static readonly cancelableStatuses: VideoStatus[] = [
    "pending",
    "processing"
  ];

  private static resolveCancelReason(reason?: string): string {
    return reason?.trim() || "Canceled by user request";
  }

  async cancelVideosByProject(
    projectId: string,
    reason?: string
  ): Promise<number> {
    const projectVideoIds = await db
      .select({ id: videos.id })
      .from(videos)
      .innerJoin(assets, eq(videos.assetId, assets.id))
      .where(eq(assets.projectId, projectId));

    if (projectVideoIds.length === 0) {
      return 0;
    }

    const canceled = await db
      .update(videos)
      .set({
        status: "canceled",
        errorMessage: VideoRepository.resolveCancelReason(reason),
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(
            videos.id,
            projectVideoIds.map((video) => video.id)
          ),
          inArray(videos.status, VideoRepository.cancelableStatuses)
        )
      )
      .returning({ id: videos.id });

    return canceled.length;
  }

  async cancelVideosByIds(
    videoIds: string[],
    reason?: string
  ): Promise<number> {
    if (videoIds.length === 0) {
      return 0;
    }

    const canceled = await db
      .update(videos)
      .set({
        status: "canceled",
        errorMessage: VideoRepository.resolveCancelReason(reason),
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(videos.id, videoIds),
          inArray(videos.status, VideoRepository.cancelableStatuses)
        )
      )
      .returning({ id: videos.id });

    return canceled.length;
  }

}

export const videoRepository = new VideoRepository();
