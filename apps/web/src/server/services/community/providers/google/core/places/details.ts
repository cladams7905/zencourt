import type { PlaceDetailsResponse } from "../../transport/client";
import type { CachedPlacePoolItem } from "../../cache";
import type { ScoredPlace } from "./index";
import { dedupePlaces, formatPlaceList, rankPlaces } from "./index";

const GENERIC_TYPE_KEYWORDS = new Set([
  "establishment",
  "point of interest",
  "food",
  "store",
  "place of worship",
  "locality",
  "neighborhood"
]);

export function deriveSummaryKeywords(details: PlaceDetailsResponse): {
  summary?: string;
  keywords?: string[];
} {
  const summary = details.generativeSummary?.overview?.text?.trim();
  if (summary) {
    return { summary };
  }
  const primary = details.primaryType ?? "";
  const types = details.types ?? [];
  const normalized = [primary, ...types]
    .filter(Boolean)
    .map((value) => value.replace(/_/g, " ").toLowerCase())
    .filter((value) => !GENERIC_TYPE_KEYWORDS.has(value));
  const keywords =
    normalized.length > 0 ? Array.from(new Set(normalized)).slice(0, 4) : [];
  return keywords.length > 0 ? { keywords } : {};
}

export async function buildCategoryListWithDetails(
  category: string,
  places: ScoredPlace[],
  max: number,
  getPlaceDetails: (placeId: string) => Promise<PlaceDetailsResponse | null>
): Promise<string> {
  const deduped = rankPlaces(dedupePlaces(places));
  const toHydrate = deduped.slice(0, max);
  await Promise.all(
    toHydrate.map(async (place) => {
      if (place.summary || (place.keywords && place.keywords.length > 0)) {
        return;
      }
      if (!place.placeId) {
        return;
      }
      const details = await getPlaceDetails(place.placeId);
      if (!details) {
        return;
      }
      if (!place.name) {
        place.name = details.displayName?.text?.trim() || place.name;
      }
      if (!place.address) {
        place.address = details.formattedAddress ?? place.address;
      }
      place.rating = details.rating ?? place.rating;
      place.reviewCount = details.userRatingCount ?? place.reviewCount;
      const { summary, keywords } = deriveSummaryKeywords(details);
      place.summary = summary;
      place.keywords = keywords;
    })
  );

  return formatPlaceList(toHydrate, max, true);
}

export async function hydratePlacesFromItems(
  items: CachedPlacePoolItem[],
  category: string,
  getPlaceDetails: (placeId: string) => Promise<PlaceDetailsResponse | null>
): Promise<ScoredPlace[]> {
  const results = await Promise.all(
    items.map(async (item): Promise<ScoredPlace | null> => {
      const { placeId, sourceQueries } = item;
      const details = await getPlaceDetails(placeId);
      if (!details) {
        return null;
      }
      const name = details.displayName?.text?.trim() || "";
      if (!name) {
        return null;
      }
      const { summary, keywords } = deriveSummaryKeywords(details);
      return {
        name,
        rating: details.rating ?? 0,
        reviewCount: details.userRatingCount ?? 0,
        address: details.formattedAddress ?? "",
        category,
        summary,
        keywords,
        placeId,
        sourceQueries
      };
    })
  );
  return results.filter((place) => place !== null);
}
