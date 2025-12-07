"use server";

import { nanoid } from "nanoid";
import { eq, and, like, desc } from "drizzle-orm";
import { db, projects, collections, assets } from "@db/client";
import { DBProject, InsertDBProject } from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";

type AssetRecord = typeof assets.$inferSelect;

/**
 * Create a new project
 * Server action that creates a project in the database
 *
 * @returns Promise<DBProject> - The created project
 * @throws Error if user is not authenticated or project creation fails
 */
export async function createProject(userId: string): Promise<DBProject> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to create a project");
  }

  return withDbErrorHandling(
    async () => {
      return db.transaction(async (tx) => {
        const projectId = nanoid();
        const [newProject] = await tx
          .insert(projects)
          .values({
            id: projectId,
            userId
          })
          .returning();

        const [collection] = await tx
          .insert(collections)
          .values({
            id: nanoid(),
            projectId
          })
          .returning();

        const [asset] = await tx
          .insert(assets)
          .values({
            id: nanoid(),
            projectId,
            type: "video",
            stage: "upload"
          })
          .returning();

        return {
          ...newProject,
          stage: asset.stage,
          thumbnailUrl: asset.thumbnailUrl,
          collectionId: collection.id,
          assetId: asset.id
        };
      });
    },
    {
      actionName: "createProject",
      errorMessage: "Failed to create project. Please try again."
    }
  );
}

/**
 * Update project
 * Server action that updates one or more fields of a project
 *
 * @param projectId - The ID of the project to update
 * @param updates - Partial project object with fields to update
 * @returns Promise<DBProject> - The updated project
 * @throws Error if user is not authenticated or update fails
 */
export async function updateProject(
  userId: string,
  projectId: string,
  updates: Partial<Omit<InsertDBProject, "id" | "userId" | "createdAt">>
): Promise<DBProject> {
  if (!projectId || projectId.trim() === "") {
    throw new Error("Project ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update a project");
  }

  return withDbErrorHandling(
    async () => {
      const [updatedProject] = await db
        .update(projects)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(eq(projects.id, projectId), eq(projects.userId, userId)))
        .returning();

      if (!updatedProject) {
        throw new Error("Project not found");
      }

      return updatedProject;
    },
    {
      actionName: "updateProject",
      context: { projectId },
      errorMessage: "Failed to update project. Please try again."
    }
  );
}

/**
 * Get all projects for the current user
 * Server action that retrieves all projects belonging to the authenticated user
 *
 * @returns Promise<DBProject[]> - Array of user's projects
 * @throws Error if user is not authenticated
 */
export async function getUserProjects(userId: string): Promise<DBProject[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch projects");
  }

  return withDbErrorHandling(
    async () => {
      const rows = await db
        .select({
          project: projects,
          collection: collections.id,
          asset: assets
        })
        .from(projects)
        .leftJoin(collections, eq(collections.projectId, projects.id))
        .leftJoin(assets, eq(assets.projectId, projects.id))
        .where(eq(projects.userId, userId))
        .orderBy(desc(projects.createdAt));

      const projectMap = new Map<
        string,
        {
          project: (typeof projects.$inferSelect);
          collectionId: string | null;
          assets: AssetRecord[];
        }
      >();

      for (const { project, collection, asset } of rows) {
        let entry = projectMap.get(project.id);
        if (!entry) {
          entry = {
            project,
            collectionId: collection ?? null,
            assets: []
          };
          projectMap.set(project.id, entry);
        } else if (entry.collectionId == null && collection) {
          entry.collectionId = collection;
        }

        if (asset) {
          const alreadyExists = entry.assets.some(
            (existing) => existing.id === asset.id
          );
          if (!alreadyExists) {
            entry.assets.push(asset);
          }
        }
      }

      return Array.from(projectMap.values()).map(
        ({ project, collectionId, assets }) => {
          const primaryAsset = assets.reduce<AssetRecord | null>(
            (latest, current) => {
              if (!latest) return current;
              const latestTime = latest.updatedAt
                ? new Date(latest.updatedAt).getTime()
                : 0;
              const currentTime = current.updatedAt
                ? new Date(current.updatedAt).getTime()
                : 0;
              return currentTime > latestTime ? current : latest;
            },
            null
          );

          return {
            ...project,
            collectionId,
            assetId: primaryAsset?.id ?? null,
            stage: primaryAsset?.stage ?? "upload",
            thumbnailUrl: primaryAsset?.thumbnailUrl ?? null,
            assets
          };
        }
      );
    },
    {
      actionName: "getUserProjects",
      errorMessage: "Failed to fetch projects. Please try again."
    }
  );
}

/**
 * Get the next draft number for the user
 * Counts existing draft projects and returns the next sequential number
 *
 * @returns Promise<number> - The next draft number
 * @throws Error if user is not authenticated
 */
export async function getNextDraftNumber(userId: string): Promise<number> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch draft numbers");
  }

  return withDbErrorHandling(
    async () => {
      // Get all projects with titles starting with "Draft "
      const draftProjects = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.userId, userId), like(projects.title, "Draft %"))
        );

      // Extract draft numbers and find the highest
      const draftNumbers = draftProjects
        .map((p) => {
          const match = p.title?.match(/^Draft (\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((num) => !isNaN(num));

      const maxDraftNumber =
        draftNumbers.length > 0 ? Math.max(...draftNumbers) : 0;

      return maxDraftNumber + 1;
    },
    {
      actionName: "getNextDraftNumber",
      errorMessage: "Failed to get draft number. Please try again."
    }
  );
}
