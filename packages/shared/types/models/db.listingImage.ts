import { listingImages } from "@db/client";

export type DBListingImage = typeof listingImages.$inferSelect;

export type InsertDBListingImage = typeof listingImages.$inferInsert;

export type ImageMetadata = {
  width: number;
  height: number;
  format: string;
  size: number;
  lastModified: number;
  perspective?: "aerial" | "ground";
};
