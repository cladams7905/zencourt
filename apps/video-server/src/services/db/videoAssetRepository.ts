import { and, eq, exists, inArray } from "@db/client";
import { db, videoAssets as videos, assets } from "@db/client";
import type { VideoStatus } from "@shared/types/models";

export type DbVideoAsset = typeof videos.$inferSelect;

class VideoAssetRepository {
  private static readonly cancelableStatuses: VideoStatus[] = [
    "pending",
    "processing"
  ];

  private static resolveCancelReason(reason?: string): string {
    return reason?.trim() || "Canceled by user request";
  }

  async cancelByProject(
    projectId: string,
    reason?: string
  ): Promise<number> {
    const canceled = await db
      .update(videos)
      .set({
        status: "canceled",
        errorMessage: VideoAssetRepository.resolveCancelReason(reason),
        updatedAt: new Date()
      })
      .where(
        and(
          exists(
            db
              .select({ id: assets.id })
              .from(assets)
              .where(
                and(
                  eq(assets.id, videos.assetId),
                  eq(assets.projectId, projectId)
                )
              )
          ),
          inArray(videos.status, VideoAssetRepository.cancelableStatuses)
        )
      )
      .returning({ id: videos.id });

    return canceled.length;
  }

  async cancelByIds(
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
        errorMessage: VideoAssetRepository.resolveCancelReason(reason),
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(videos.id, videoIds),
          inArray(videos.status, VideoAssetRepository.cancelableStatuses)
        )
      )
      .returning({ id: videos.id });

    return canceled.length;
  }
}

export const videoAssetRepository = new VideoAssetRepository();
