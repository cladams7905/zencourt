import { collectionImages, collections } from "@db/client";

export type DBCollection = typeof collections.$inferSelect;

export type InsertDBCollection = typeof collections.$inferInsert;

export type DBImage = typeof collectionImages.$inferSelect;

export type InsertDBImage = typeof collectionImages.$inferInsert;

export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  size: number;
  lastModified: number;
};
