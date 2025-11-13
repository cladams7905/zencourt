import { eq } from "drizzle-orm";
import { db, projects } from "@db/client";
import type { ProjectMetadata } from "@shared/types/models";

export type DbProject = typeof projects.$inferSelect;

class ProjectRepository {
  async findById(projectId: string): Promise<DbProject | null> {
    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, projectId))
      .limit(1);

    return project ?? null;
  }

  async markVideoCompleted(options: {
    project: DbProject;
    videoUrl: string;
    duration: number;
    thumbnailUrl?: string | null;
    resolution?: { width: number; height: number } | null;
    completedAt?: string;
  }): Promise<void> {
    const metadata: ProjectMetadata = {
      ...(options.project.metadata || {}),
      videoThumbnailUrl: options.thumbnailUrl ?? options.project.metadata?.videoThumbnailUrl,
      videoResolution: options.resolution ?? options.project.metadata?.videoResolution,
      completedAt: options.completedAt || new Date().toISOString(),
    };

    delete (metadata as ProjectMetadata).error;

    await db
      .update(projects)
      .set({
        videoGenerationStatus: "completed",
        finalVideoUrl: options.videoUrl,
        finalVideoDuration: options.duration,
        metadata,
        updatedAt: new Date()
      })
      .where(eq(projects.id, options.project.id));
  }

  async markVideoFailed(options: {
    project: DbProject;
    errorMessage: string;
    errorType?: string;
    retryable?: boolean;
    failedAt?: string;
  }): Promise<void> {
    const metadata: ProjectMetadata = {
      ...(options.project.metadata || {}),
      error: {
        message: options.errorMessage,
        type: options.errorType || "PROCESSING_ERROR",
        retryable: options.retryable ?? false,
        failedAt: options.failedAt || new Date().toISOString()
      }
    };

    await db
      .update(projects)
      .set({
        videoGenerationStatus: "failed",
        metadata,
        updatedAt: new Date()
      })
      .where(eq(projects.id, options.project.id));
  }
}

export const projectRepository = new ProjectRepository();
