import type { ListingPropertyDetails } from "@shared/types/models";

export type SelectMode = "preset" | "custom";

export type ListingReviewViewProps = {
  listingId: string;
  userId: string;
  title: string;
  address: string | null;
  propertyDetails: ListingPropertyDetails | null;
  targetAudiences?: string[] | null;
};

export type UpdateReviewSection = <T extends keyof ListingPropertyDetails>(
  key: T,
  updater: (
    prev: NonNullable<ListingPropertyDetails[T]>
  ) => NonNullable<ListingPropertyDetails[T]>
) => void;
