import { projects } from "@db/client";

export type DBProject = typeof projects.$inferSelect;

export type InsertDBProject = typeof projects.$inferInsert;

/**
 * The five stages of the project creation workflow
 */
export type ProjectStage =
  | "upload"
  | "categorize"
  | "plan"
  | "review"
  | "generate"
  | "complete";
