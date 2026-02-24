"use server";

import {
  fetchAndPersistPropertyDetails,
  buildPropertyDetailsRevision
} from "@web/src/server/services/propertyDetails";
import type { ListingPropertyDetails } from "@shared/types/models";
import { updateListing } from "@web/src/server/models/listings";
import {
  requireListingId,
  requireUserId
} from "@web/src/server/actions/shared/validation";
import { requireAuthenticatedUser } from "@web/src/server/auth/apiAuth";

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

  return fetchAndPersistPropertyDetails({ userId, listingId, addressOverride });
}

export async function saveListingPropertyDetails(
  userId: string,
  listingId: string,
  propertyDetails: ListingPropertyDetails
) {
  requireUserId(userId, "User ID is required to save listing details");
  requireListingId(listingId, "Listing ID is required to save listing details");

  const revision = buildPropertyDetailsRevision(propertyDetails);

  return updateListing(userId, listingId, {
    propertyDetails,
    propertyDetailsRevision: revision,
    listingStage: "review",
    address: propertyDetails.address ?? null
  });
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
