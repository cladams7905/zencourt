import { and, eq, exists, inArray } from "@db/client";
import { db, videoContent as videos, content } from "@db/client";
import type { VideoStatus } from "@shared/types/models";

export type DbVideoContent = typeof videos.$inferSelect;

class VideoContentRepository {
  private static readonly cancelableStatuses: VideoStatus[] = [
    "pending",
    "processing"
  ];

  private static resolveCancelReason(reason?: string): string {
    return reason?.trim() || "Canceled by user request";
  }

  async cancelByCampaign(
    campaignId: string,
    reason?: string
  ): Promise<number> {
    const canceled = await db
      .update(videos)
      .set({
        status: "canceled",
        errorMessage: VideoContentRepository.resolveCancelReason(reason),
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
                  eq(content.id, videos.contentId),
                  eq(content.campaignId, campaignId)
                )
              )
          ),
          inArray(videos.status, VideoContentRepository.cancelableStatuses)
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
        errorMessage: VideoContentRepository.resolveCancelReason(reason),
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(videos.id, videoIds),
          inArray(videos.status, VideoContentRepository.cancelableStatuses)
        )
      )
      .returning({ id: videos.id });

    return canceled.length;
  }
}

export const videoContentRepository = new VideoContentRepository();
