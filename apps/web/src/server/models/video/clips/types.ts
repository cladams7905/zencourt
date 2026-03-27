import type { InsertDBVideoClip, InsertDBVideoClipVersion } from "@db/types/models";

export type VideoClipUpdates = Partial<
  Omit<InsertDBVideoClip, "id" | "listingId" | "createdAt" | "updatedAt">
>;

export type VideoClipVersionUpdates = Partial<
  Omit<InsertDBVideoClipVersion, "id" | "videoClipId" | "createdAt" | "updatedAt">
>;
