"use server";

import { nanoid } from "nanoid";
import { eq, and, like, desc } from "drizzle-orm";
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
export async function createProject(userId: string): Promise<DBProject> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to create a project");
  }

  return withDbErrorHandling(
    async () => {
      const [newProject] = await db
        .insert(projects)
        .values({
          id: nanoid(),
          userId,
          stage: "upload"
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
      const userProjects = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, userId))
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
