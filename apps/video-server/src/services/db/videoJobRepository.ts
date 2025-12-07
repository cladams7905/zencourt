import {
  db,
  videoAssetJobs as videoJobs,
  videoAssets,
  assets,
  and,
  eq,
  inArray
} from "@db/client";
import type { VideoStatus } from "@shared/types/models";

const CANCELABLE_STATUSES: VideoStatus[] = ["pending", "processing"];

function cancelReason(reason?: string): string {
  return reason?.trim() || "Canceled by user request";
}

class VideoJobRepository {
  /**
   * Cancel all jobs for videos belonging to a project
   */
  async cancelJobsByProjectId(
    projectId: string,
    reason?: string
  ): Promise<number> {
    // First, find all video assets belonging to this project
    const projectVideos = await db
      .select({ id: videoAssets.id })
      .from(videoAssets)
      .innerJoin(assets, eq(videoAssets.assetId, assets.id))
      .where(eq(assets.projectId, projectId));

    if (projectVideos.length === 0) {
      return 0;
    }

    const videoIds = projectVideos.map((v) => v.id);

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
          inArray(videoJobs.videoAssetId, videoIds),
          inArray(videoJobs.status, CANCELABLE_STATUSES)
        )
      )
      .returning({ id: videoJobs.id });

    return canceled.length;
  }
}

export const videoJobRepository = new VideoJobRepository();
