import { createHash } from "crypto";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { ListingPropertyDetails } from "@shared/types/models";
import { getListingById, updateListing } from "@web/src/server/models/listings";
import { getDefaultPropertyDetailsProvider } from "./providers";
import type { PropertyDetailsProvider } from "./providers/types";
import { normalizeListingPropertyDetails } from "./domain/normalize";
import { parseListingPropertyRaw } from "./domain/parsing";

const logger = createChildLogger(baseLogger, {
  module: "listing-property-service"
});

export function buildPropertyDetailsRevision(
  details: ListingPropertyDetails
): string {
  return createHash("sha256").update(JSON.stringify(details)).digest("hex");
}

export async function fetchPropertyDetails(
  address: string,
  provider?: PropertyDetailsProvider
): Promise<ListingPropertyDetails | null> {
  if (!address || address.trim() === "") {
    throw new Error("Address is required to fetch property details");
  }

  const resolvedProvider = provider ?? getDefaultPropertyDetailsProvider();
  const parsed = await resolvedProvider.fetch(address);

  const rawPayload = parseListingPropertyRaw(parsed);
  const normalized = rawPayload
    ? normalizeListingPropertyDetails(rawPayload, address)
    : null;

  if (!normalized) {
    logger.warn({ address }, "Property details response invalid");
  }

  return normalized;
}

export async function fetchAndPersistPropertyDetails(params: {
  userId: string;
  listingId: string;
  addressOverride?: string | null;
}) {
  const { userId, listingId, addressOverride } = params;

  const listing = await getListingById(userId, listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  const address = (addressOverride ?? listing.address ?? "").trim();
  if (!address) {
    throw new Error("Listing address is required to fetch property details");
  }

  const provider = getDefaultPropertyDetailsProvider();
  const propertyDetails = await fetchPropertyDetails(address, provider);
  if (!propertyDetails) {
    throw new Error("Failed to fetch property details");
  }

  const revision = buildPropertyDetailsRevision(propertyDetails);

  const updated = await updateListing(userId, listingId, {
    propertyDetails,
    propertyDetailsSource: provider.name,
    propertyDetailsFetchedAt: new Date(),
    propertyDetailsRevision: revision,
    listingStage: "review"
  });

  logger.info({ listingId, revision }, "Listing property details updated");

  return updated;
}
