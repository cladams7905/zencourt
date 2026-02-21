import type {
  ListingContentSubcategory,
  ListingPropertyDetails
} from "@shared/types/models";

export type ListingMediaType = "video" | "image";

export type ListingGeneratedItem = {
  hook: string;
  broll_query: string;
  body: null | Array<{
    header: string;
    content: string;
    broll_query: string;
  }>;
  cta: string | null;
  caption: string;
};

export type ContentStreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      items: ListingGeneratedItem[];
      meta: { model: string; batch_size: number };
    }
  | { type: "error"; message: string };

export type GenerateListingContentBody = {
  subcategory?: string;
  media_type?: string;
  focus?: string;
  notes?: string;
  generation_nonce?: string;
};

export type ValidatedGenerateParams = {
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  focus: string;
  notes: string;
  generationNonce: string;
};

export type ListingGenerationContext = {
  listingId: string;
  userId: string;
  listingDetails: ListingPropertyDetails | null;
  addressParts: { city: string; state: string; zipCode: string };
  resolvedState: string;
  propertyFingerprint: string;
  cacheKey: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  focus: string;
  notes: string;
};
