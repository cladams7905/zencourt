import type {
  ListingContentSubcategory,
  ListingPropertyDetails
} from "@shared/types/models";
import type {
  ListingGeneratedItem,
  ListingMediaType
} from "@web/src/server/infra/cache/listingContent";

export type { ListingGeneratedItem, ListingMediaType };

export type GenerateListingContentBody = {
  subcategory?: string;
  media_type?: string;
  focus?: string;
  notes?: string;
  generation_nonce?: string;
  generation_count?: number;
  template_id?: string;
};

export type ValidatedGenerateParams = {
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  focus: string;
  notes: string;
  generationNonce: string;
  generationCount: number;
  templateId: string;
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
  generationCount: number;
  templateId: string;
};
