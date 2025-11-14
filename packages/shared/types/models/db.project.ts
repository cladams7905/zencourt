import { projects } from "@db/client";

export type DBProject = typeof projects.$inferSelect;

export type InsertDBProject = typeof projects.$inferInsert;

export type ProjectStatus = "draft" | "published";
