import type { VideoOrientation } from "@shared/types/models";
import type { DBListingImage } from "@db/types/models";

export type ResolvePublicDownloadUrls = (urls: string[]) => string[];

export type StartListingVideoGenerationArgs = {
  listingId: string;
  userId: string;
  orientation?: VideoOrientation;
  aiDirections?: string;
  resolvePublicDownloadUrls: ResolvePublicDownloadUrls;
};

export type CancelListingVideoGenerationArgs = {
  batchId: string;
  reason?: string;
};

export type CancelListingVideoGenerationResult = {
  success: true;
  batchId: string;
  canceledBatches: number;
  canceledJobs: number;
};

export type RegenerateListingClipVersionArgs = {
  listingId: string;
  userId: string;
  clipId: string;
  aiDirections?: string;
  resolvePublicDownloadUrls: ResolvePublicDownloadUrls;
};

export type RegenerateListingClipVersionResult = {
  clipId: string;
  clipVersionId: string;
  batchId: string;
};

export type ListingRoom = {
  id: string;
  name: string;
  category?: string;
  roomNumber?: number;
};

export type GroupedListingImages = Map<string, DBListingImage[]>;
