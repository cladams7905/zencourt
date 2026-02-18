import type {
  InsertDBListing
} from "@shared/types/models";

export type UpdateListingInput = Partial<
  Omit<InsertDBListing, "id" | "userId" | "createdAt">
>;

export type ListingSummaryPreview = {
  id: string;
  title: string | null;
  listingStage: string | null;
  lastOpenedAt: Date | string | null;
  createdAt: Date | string | null;
  imageCount: number;
  previewImages: string[];
};
