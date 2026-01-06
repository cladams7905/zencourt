import { imageContent } from "@db/client";

export type DBImageContent = typeof imageContent.$inferSelect;
export type InsertDBImageContent = typeof imageContent.$inferInsert;
