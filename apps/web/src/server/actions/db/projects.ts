"use server";

import { randomUUID } from "crypto";
import { eq, and, like, desc } from "drizzle-orm";
import { getUser } from "./users";
import { db, projects } from "@db/client";
import { DBProject, InsertDBProject } from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";

/**
 * Create a new project
 * Server action that creates a project in the database
 *
 * @returns Promise<DBProject> - The created project
 * @throws Error if user is not authenticated or project creation fails
 */
export async function createProject(): Promise<DBProject> {
  return withDbErrorHandling(
    async () => {
      const user = await getUser();

      const [newProject] = await db
        .insert(projects)
        .values({
          id: randomUUID(),
          userId: user.id,
          status: "uploading"
        })
        .returning();

      return newProject;
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
  projectId: string,
  updates: Partial<Omit<InsertDBProject, "id" | "userId" | "createdAt">>
): Promise<DBProject> {
  if (!projectId || projectId.trim() === "") {
    throw new Error("Project ID is required");
  }

  return withDbErrorHandling(
    async () => {
      await getUser();

      const [updatedProject] = await db
        .update(projects)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(projects.id, projectId))
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
export async function getUserProjects(): Promise<DBProject[]> {
  return withDbErrorHandling(
    async () => {
      const user = await getUser();

      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, user.id))
        .orderBy(desc(projects.createdAt));

      return userProjects;
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
export async function getNextDraftNumber(): Promise<number> {
  return withDbErrorHandling(
    async () => {
      const user = await getUser();

      // Get all projects with titles starting with "Draft "
      const draftProjects = await db
        .select()
        .from(projects)
        .where(
          and(eq(projects.userId, user.id), like(projects.title, "Draft %"))
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
