import type { ListingPropertyDetails } from "@shared/types/models";
import {
  buildListingContentCacheKey,
  buildListingPropertyFingerprint,
  parseListingAddressParts
} from "@web/src/lib/domain/listing";
import type {
  ListingGenerationContext,
  ValidatedGenerateParams
} from "./types";

type ListingRow = {
  id: string;
  userId: string;
  address?: string | null;
  propertyDetails?: unknown;
};

/**
 * Resolves listing-derived context: address parts, state, property fingerprint, and cache key.
 */
export function resolveListingContext(
  listing: ListingRow,
  params: ValidatedGenerateParams
): ListingGenerationContext {
  const listingDetails =
    (listing.propertyDetails as ListingPropertyDetails | null) ?? null;
  const address =
    listingDetails?.address?.trim() || listing.address?.trim() || "";
  const addressParts = parseListingAddressParts(address);
  const locationState = listingDetails?.location_context?.state?.trim() ?? "";
  const resolvedState = locationState || addressParts.state;
  const propertyFingerprint = buildListingPropertyFingerprint(listingDetails);
  const cacheKey = buildListingContentCacheKey({
    userId: listing.userId,
    listingId: listing.id,
    subcategory: params.subcategory,
    mediaType: params.mediaType,
    focus: params.focus,
    notes: params.notes,
    generation_nonce: params.generationNonce,
    propertyFingerprint
  });

  return {
    listingId: params.listingId,
    userId: listing.userId,
    listingDetails,
    addressParts,
    resolvedState,
    propertyFingerprint,
    cacheKey,
    subcategory: params.subcategory,
    mediaType: params.mediaType,
    focus: params.focus,
    notes: params.notes
  };
}
