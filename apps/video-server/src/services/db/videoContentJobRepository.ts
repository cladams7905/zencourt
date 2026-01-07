import { and, eq, inArray } from "@db/client";
import { db, videoContentJobs as videoJobs, videoContent, content } from "@db/client";
import type { VideoStatus } from "@shared/types/models";

const CANCELABLE_STATUSES: VideoStatus[] = ["pending", "processing"];

function cancelReason(reason?: string): string {
  return reason?.trim() || "Canceled by user request";
}

class VideoContentJobRepository {
  /**
   * Cancel all jobs for video content belonging to a campaign
   */
  async cancelJobsByCampaignId(
    campaignId: string,
    reason?: string
  ): Promise<number> {
    // First, find all video content belonging to this campaign
    const campaignVideos = await db
      .select({ id: videoContent.id })
      .from(videoContent)
      .innerJoin(content, eq(videoContent.contentId, content.id))
      .where(eq(content.campaignId, campaignId));

    if (campaignVideos.length === 0) {
      return 0;
    }

    const videoIds = campaignVideos.map((v) => v.id);

    // Cancel all jobs for those videos
    const canceled = await db
      .update(videoJobs)
      .set({
        status: "canceled",
        errorMessage: cancelReason(reason),
        updatedAt: new Date()
      })
      .where(
        and(
          inArray(videoJobs.videoContentId, videoIds),
          inArray(videoJobs.status, CANCELABLE_STATUSES)
        )
      )
      .returning({ id: videoJobs.id });

    return canceled.length;
  }
}

export const videoContentJobRepository = new VideoContentJobRepository();
