import type { ListingPropertyDetails } from "@shared/types/models";
import type { PropertyDetailsProvider } from "../providers/types";
import { normalizeListingPropertyDetails } from "./normalize";
import { parseListingPropertyRaw } from "./parsing";

const TRUSTED_IDX_HOST_PATTERNS = [
  "zillow.com",
  "redfin.com",
  "realtor.com",
  "trulia.com",
  "homes.com",
  "compass.com",
  "remax.com"
];

function matchesTrustedIdxHost(hostOrUrl: string): boolean {
  const normalized = hostOrUrl.toLowerCase();
  return (
    TRUSTED_IDX_HOST_PATTERNS.some(
      (domain) =>
        normalized === domain ||
        normalized.endsWith(`.${domain}`) ||
        normalized.includes(`.${domain}/`) ||
        normalized.includes(`://${domain}`)
    ) ||
    normalized.includes("mls") ||
    normalized.includes("idx")
  );
}

function isTrustedIdxCitation(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return matchesTrustedIdxHost(hostname);
  } catch {
    return matchesTrustedIdxHost(url);
  }
}

function hasTrustedIdxSource(
  source: NonNullable<NonNullable<ListingPropertyDetails["sources"]>[number]>
): boolean {
  const site = source?.site ?? "";
  const citation = source?.citation ?? "";
  return matchesTrustedIdxHost(site) || isTrustedIdxCitation(citation);
}

function enforceOpenHouseCitationPolicy(
  details: ListingPropertyDetails | null
): ListingPropertyDetails | null {
  if (!details) {
    return null;
  }
  const openHouseEvents = details.open_house_events ?? null;
  if (!openHouseEvents || openHouseEvents.length === 0) {
    return details;
  }

  const trustedSourceCount =
    details.sources?.filter((source) => hasTrustedIdxSource(source)).length ?? 0;

  if (trustedSourceCount > 0) {
    return details;
  }

  return {
    ...details,
    open_house_events: null
  };
}

export async function fetchPropertyDetails(
  address: string,
  provider: PropertyDetailsProvider
): Promise<ListingPropertyDetails | null> {
  if (!address || address.trim() === "") {
    throw new Error("Address is required to fetch property details");
  }

  const parsed = await provider.fetch(address);
  const rawPayload = parseListingPropertyRaw(parsed);
  const normalized = rawPayload
    ? normalizeListingPropertyDetails(rawPayload, address)
    : null;
  return enforceOpenHouseCitationPolicy(normalized);
}
