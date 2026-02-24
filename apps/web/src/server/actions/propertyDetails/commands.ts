"use server";

import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { getListingById, updateListing } from "@web/src/server/models/listings";
import {
  buildPropertyDetailsRevision,
  fetchPropertyDetails as fetchPropertyDetailsFromProvider,
  getDefaultPropertyDetailsProvider
} from "@web/src/server/services/propertyDetails";
import type { ListingPropertyDetails } from "@shared/types/models";
import {
  requireListingId,
  requireUserId
} from "@web/src/server/actions/shared/validation";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";

const logger = createChildLogger(baseLogger, {
  module: "property-details-actions"
});

export async function fetchPropertyDetails(
  userId: string,
  listingId: string,
  addressOverride?: string | null
) {
  requireUserId(userId, "User ID is required to fetch listing details");
  requireListingId(
    listingId,
    "Listing ID is required to fetch listing details"
  );

  const listing = await getListingById(userId, listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  const address = (addressOverride ?? listing.address ?? "").trim();
  if (!address) {
    throw new Error("Listing address is required to fetch property details");
  }

  const provider = getDefaultPropertyDetailsProvider();
  const propertyDetails = await fetchPropertyDetailsFromProvider(
    address,
    provider
  );
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

export async function saveListingPropertyDetails(
  userId: string,
  listingId: string,
  propertyDetails: ListingPropertyDetails
) {
  requireUserId(userId, "User ID is required to save listing details");
  requireListingId(listingId, "Listing ID is required to save listing details");

  const revision = buildPropertyDetailsRevision(propertyDetails);

  const updated = await updateListing(userId, listingId, {
    propertyDetails,
    propertyDetailsRevision: revision,
    listingStage: "review",
    address: propertyDetails.address ?? null
  });

  logger.info({ listingId, revision }, "Listing property details saved");

  return updated;
}

export async function fetchPropertyDetailsForCurrentUser(
  listingId: string,
  addressOverride?: string | null
) {
  const user = await requireAuthenticatedUser();
  return fetchPropertyDetails(user.id, listingId, addressOverride);
}

export async function saveListingPropertyDetailsForCurrentUser(
  listingId: string,
  propertyDetails: ListingPropertyDetails
) {
  const user = await requireAuthenticatedUser();
  return saveListingPropertyDetails(user.id, listingId, propertyDetails);
}
