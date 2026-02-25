import { createHash } from "node:crypto";
import type { ListingPropertyDetails } from "@shared/types/models";
import { buildListingContentCacheKey } from "@web/src/server/cache/listingContent";
import type {
  ListingGenerationContext,
  ValidatedGenerateParams
} from "./types";

function parseListingAddressParts(address?: string | null): {
  city: string;
  state: string;
  zipCode: string;
} {
  const normalized = (address ?? "").trim();
  if (!normalized) {
    return { city: "", state: "", zipCode: "" };
  }

  const zipMatch = normalized.match(/\b\d{5}(?:-\d{4})?\b/);
  const zipCode = zipMatch?.[0] ?? "";

  const segments = normalized
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const city = segments.length >= 2 ? segments[segments.length - 2] : "";

  let state = "";
  if (segments.length > 0) {
    const tail = segments[segments.length - 1];
    const stateMatch = tail.match(/\b[A-Z]{2}\b/);
    state = stateMatch?.[0] ?? "";
  }

  return { city, state, zipCode };
}

function buildListingPropertyFingerprint(
  listingPropertyDetails?: ListingPropertyDetails | null
): string {
  return createHash("sha256")
    .update(JSON.stringify(listingPropertyDetails ?? {}))
    .digest("hex")
    .slice(0, 16);
}

type ListingRow = {
  id: string;
  userId: string;
  address?: string | null;
  propertyDetails?: unknown;
};

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
    notes: params.notes,
    generationCount: params.generationCount,
    templateId: params.templateId
  };
}
