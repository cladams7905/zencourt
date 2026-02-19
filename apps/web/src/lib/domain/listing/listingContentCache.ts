import { createHash } from "node:crypto";
import type {
  ListingContentSubcategory,
  ListingPropertyDetails
} from "@shared/types/models";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";

export const LISTING_CONTENT_CACHE_PREFIX = "listing-content";
export const LISTING_CONTENT_CACHE_TTL_SECONDS = 60 * 60 * 12;

export type ListingMediaType = "video" | "image";

export function parseListingAddressParts(address?: string | null): {
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

export function isListingSubcategory(
  value: string
): value is ListingContentSubcategory {
  return (LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(value);
}

export function isListingMediaType(value: string): value is ListingMediaType {
  return value === "video" || value === "image";
}

export function buildListingPropertyFingerprint(
  listingPropertyDetails?: ListingPropertyDetails | null
): string {
  return createHash("sha256")
    .update(JSON.stringify(listingPropertyDetails ?? {}))
    .digest("hex")
    .slice(0, 16);
}

export function buildListingContentCacheKey(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
  focus: string;
  notes: string;
  generation_nonce: string;
  propertyFingerprint: string;
}): string {
  const focusHash = createHash("sha1")
    .update(`${params.focus}::${params.notes}::${params.generation_nonce}`)
    .digest("hex")
    .slice(0, 10);
  return [
    LISTING_CONTENT_CACHE_PREFIX,
    params.userId,
    params.listingId,
    params.subcategory,
    params.mediaType,
    params.propertyFingerprint,
    focusHash
  ].join(":");
}
