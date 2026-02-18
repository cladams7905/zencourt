"use server";

import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";
import { getListingById, updateListing } from "../db/listings";
import {
  buildPropertyDetailsRevision,
  fetchPropertyDetailsFromPerplexity
} from "../../services/listingPropertyService";
import type { ListingPropertyDetails } from "@shared/types/models";
import {
  requireListingId,
  requireUserId
} from "../shared/validation";

const logger = createChildLogger(baseLogger, {
  module: "listing-property-actions"
});

export async function fetchListingPropertyDetails(
  userId: string,
  listingId: string,
  addressOverride?: string | null
) {
  requireUserId(userId, "User ID is required to fetch listing details");
  requireListingId(listingId, "Listing ID is required to fetch listing details");

  const listing = await getListingById(userId, listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  const address =
    (addressOverride ?? listing.address ?? "").trim();
  if (!address) {
    throw new Error("Listing address is required to fetch property details");
  }

  const propertyDetails = await fetchPropertyDetailsFromPerplexity(address);
  if (!propertyDetails) {
    throw new Error("Failed to fetch property details");
  }

  const revision = buildPropertyDetailsRevision(propertyDetails);

  const updated = await updateListing(userId, listingId, {
    propertyDetails,
    propertyDetailsSource: "perplexity",
    propertyDetailsFetchedAt: new Date(),
    propertyDetailsRevision: revision,
    listingStage: "review"
  });

  logger.info(
    { listingId, revision },
    "Listing property details updated"
  );

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
