import { eq } from "drizzle-orm";
import { db, projects, videos } from "@db/client";

export type DbVideo = typeof videos.$inferSelect;
export type DbProject = typeof projects.$inferSelect;

export interface VideoWithProject {
  video: DbVideo;
  project: DbProject | null;
}

class VideoRepository {
  async findById(videoId: string): Promise<DbVideo | null> {
    const [record] = await db
      .select()
      .from(videos)
      .where(eq(videos.id, videoId))
      .limit(1);

    return record ?? null;
  }

  async findByFalRequestId(requestId: string): Promise<VideoWithProject | null> {
    const [record] = await db
      .select({
        video: videos,
        project: projects
      })
      .from(videos)
      .leftJoin(projects, eq(projects.id, videos.projectId))
      .where(eq(videos.falRequestId, requestId))
      .limit(1);

    if (!record) {
      return null;
    }

    return {
      video: record.video,
      project: record.project ?? null
    };
  }

  async markProcessing(options: {
    videoId: string;
    falRequestId: string;
    generationSettings?: Record<string, unknown>;
  }): Promise<void> {
    await db
      .update(videos)
      .set({
        falRequestId: options.falRequestId,
        generationSettings: options.generationSettings,
        status: "processing",
        updatedAt: new Date()
      })
      .where(eq(videos.id, options.videoId));
  }

  async markCompleted(options: {
    videoId: string;
    videoUrl: string;
    duration: number;
    thumbnailUrl?: string | null;
  }): Promise<void> {
    await db
      .update(videos)
      .set({
        status: "completed",
        videoUrl: options.videoUrl,
        duration: options.duration,
        thumbnailUrl: options.thumbnailUrl ?? null,
        errorMessage: null,
        updatedAt: new Date()
      })
      .where(eq(videos.id, options.videoId));
  }

  async markFailed(videoId: string, errorMessage: string): Promise<void> {
    await db
      .update(videos)
      .set({
        status: "failed",
        errorMessage,
        updatedAt: new Date()
      })
      .where(eq(videos.id, videoId));
  }
}

export const videoRepository = new VideoRepository();
