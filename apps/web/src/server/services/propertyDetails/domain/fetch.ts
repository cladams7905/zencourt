import type { ListingPropertyDetails } from "@shared/types/models";
import type { PropertyDetailsProvider } from "../providers/types";
import { normalizeListingPropertyDetails } from "./normalize";
import { parseListingPropertyRaw } from "./parsing";

export async function fetchPropertyDetails(
  address: string,
  provider: PropertyDetailsProvider
): Promise<ListingPropertyDetails | null> {
  if (!address || address.trim() === "") {
    throw new Error("Address is required to fetch property details");
  }

  const parsed = await provider.fetch(address);
  const rawPayload = parseListingPropertyRaw(parsed);

  return rawPayload ? normalizeListingPropertyDetails(rawPayload, address) : null;
}
