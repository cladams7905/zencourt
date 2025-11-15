import { and, eq, inArray } from "drizzle-orm";
import { db, videoJobs, videos } from "@db/client";
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
    // First, find all videos for this project
    const projectVideos = await db
      .select({ id: videos.id })
      .from(videos)
      .where(eq(videos.projectId, projectId));

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
          inArray(videoJobs.videoId, videoIds),
          inArray(videoJobs.status, CANCELABLE_STATUSES)
        )
      )
      .returning({ id: videoJobs.id });

    return canceled.length;
  }
}

export const videoJobRepository = new VideoJobRepository();
