"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import {
  fetchPropertyDetails as fetchPropertyDetailsFromService,
  buildPropertyDetailsRevision,
  getDefaultPropertyDetailsProvider
} from "@web/src/server/services/propertyDetails";
import { generateText } from "@web/src/server/services/ai";
import type { AITextRequest } from "@web/src/server/services/ai";
import type { ListingPropertyDetails } from "@shared/types/models";
import { getListingById, updateListing } from "@web/src/server/models/listings";
import {
  requireListingId,
  requireUserId
} from "@web/src/server/actions/shared/validation";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";

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

  const provider = getDefaultPropertyDetailsProvider({
    runStructuredQuery: async ({
      systemPrompt,
      userPrompt,
      responseFormat
    }) => {
      const result = await generateText({
        provider: "perplexity",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        responseFormat: responseFormat as AITextRequest["responseFormat"]
      });
      return result?.raw ?? null;
    }
  });

  const propertyDetails = await fetchPropertyDetailsFromService(
    address,
    provider
  );
  if (!propertyDetails) {
    throw new Error("Failed to fetch property details");
  }

  const revision = buildPropertyDetailsRevision(propertyDetails);

  return updateListing(userId, listingId, {
    propertyDetails,
    propertyDetailsSource: provider.name,
    propertyDetailsFetchedAt: new Date(),
    propertyDetailsRevision: revision,
    listingStage: "review"
  });
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

export const fetchPropertyDetailsForCurrentUser = withServerActionCaller(
  "serverAction:fetchPropertyDetailsForCurrentUser",
  async (listingId: string, addressOverride?: string | null) => {
    const user = await requireAuthenticatedUser();
    return fetchPropertyDetails(user.id, listingId, addressOverride);
  }
);

export const saveListingPropertyDetailsForCurrentUser = withServerActionCaller(
  "serverAction:saveListingPropertyDetailsForCurrentUser",
  async (listingId: string, propertyDetails: ListingPropertyDetails) => {
    const user = await requireAuthenticatedUser();
    return saveListingPropertyDetails(user.id, listingId, propertyDetails);
  }
);
