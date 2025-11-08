/**
 * DB Entity Types
 */
import { projects, images } from "@zencourt/db";

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Image = typeof images.$inferSelect;
export type NewImage = typeof images.$inferInsert;
