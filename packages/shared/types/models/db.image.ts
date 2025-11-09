import { images } from "@db/client";

export type DBImage = typeof images.$inferSelect;

export type InsertDBImage = typeof images.$inferInsert;

export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  size: number;
  lastModified: number;
};
