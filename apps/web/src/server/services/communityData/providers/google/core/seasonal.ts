import { createHash } from "node:crypto";
import type { CommunityData } from "@web/src/lib/domain/market/types";
import {
  ALASKA_STATES,
  ATLANTIC_SOUTH_STATES,
  CALIFORNIA_STATES,
  DESERT_SOUTHWEST_STATES,
  GREAT_LAKES_STATES,
  GULF_COAST_STATES,
  HAWAII_STATES,
  MID_ATLANTIC_STATES,
  MOUNTAIN_STATES,
  NEW_ENGLAND_STATES,
  PACIFIC_NORTHWEST_STATES,
  type CategoryKey
} from "@web/src/server/services/_config/community";
import { GEO_SEASON_QUERY_PACK } from "../transport/queries/geographicQueries";
import { HOLIDAY_QUERY_PACK } from "../transport/queries/holidaySeasonQueries";
import { getUtcMonthKey } from "../../../shared/common";
import { formatPlaceList, sampleRandom, type ScoredPlace } from "./places";
import type { CityRecord } from "./geo";

type GeoSeasonRegionKey =
  | "pacific_northwest"
  | "mountain"
  | "desert_southwest"
  | "gulf_coast"
  | "atlantic_south"
  | "mid_atlantic"
  | "new_england"
  | "great_lakes"
  | "california"
  | "hawaii"
  | "alaska";

export const LOW_PRIORITY_ANCHOR_CATEGORIES = new Set<CategoryKey>([
  "entertainment",
  "attractions",
  "sports_rec",
  "arts_culture",
  "fitness_wellness",
  "shopping",
  "education",
  "community_events"
]);

export const CATEGORY_FIELD_MAP: Record<CategoryKey, keyof CommunityData> = {
  neighborhoods: "neighborhoods_list",
  dining: "dining_list",
  coffee_brunch: "coffee_brunch_list",
  nature_outdoors: "nature_outdoors_list",
  entertainment: "entertainment_list",
  attractions: "attractions_list",
  sports_rec: "sports_rec_list",
  arts_culture: "arts_culture_list",
  nightlife_social: "nightlife_social_list",
  fitness_wellness: "fitness_wellness_list",
  shopping: "shopping_list",
  education: "education_list",
  community_events: "community_events_list"
};

export const NON_NEIGHBORHOOD_CATEGORY_KEYS = (
  Object.keys(CATEGORY_FIELD_MAP) as CategoryKey[]
).filter((category) => category !== "neighborhoods");

function deriveGeoSeasonRegionKey(
  location: CityRecord
): GeoSeasonRegionKey | null {
  const state = location.state_id;

  if (PACIFIC_NORTHWEST_STATES.has(state)) return "pacific_northwest";
  if (MOUNTAIN_STATES.has(state)) return "mountain";
  if (DESERT_SOUTHWEST_STATES.has(state)) return "desert_southwest";
  if (GULF_COAST_STATES.has(state)) return "gulf_coast";
  if (ATLANTIC_SOUTH_STATES.has(state)) return "atlantic_south";
  if (MID_ATLANTIC_STATES.has(state)) return "mid_atlantic";
  if (NEW_ENGLAND_STATES.has(state)) return "new_england";
  if (GREAT_LAKES_STATES.has(state)) return "great_lakes";
  if (CALIFORNIA_STATES.has(state)) return "california";
  if (HAWAII_STATES.has(state)) return "hawaii";
  if (ALASKA_STATES.has(state)) return "alaska";

  return null;
}

export function normalizeQueryKey(query: string): string {
  return query.toLowerCase().trim();
}

export function mergeUniqueQueries(
  base: string[],
  additions: string[]
): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const query of [...base, ...additions]) {
    const normalized = query.toLowerCase().trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    merged.push(query);
  }

  return merged;
}

export function buildSeasonalQueries(
  location: CityRecord,
  category: CategoryKey,
  queries: string[],
  date = new Date(),
  allowedCategories?: Set<CategoryKey>,
  usedSeasonalHeaders?: Set<string>
): { queries: string[]; seasonalQueries: Set<string> } {
  if (allowedCategories && !allowedCategories.has(category)) {
    return { queries: [...queries], seasonalQueries: new Set() };
  }

  const region = deriveGeoSeasonRegionKey(location);
  const monthKey = getUtcMonthKey(date);
  const holiday = HOLIDAY_QUERY_PACK[category]?.[monthKey] ?? [];
  const geoSeason = region
    ? (GEO_SEASON_QUERY_PACK[category]?.[region]?.[monthKey] ?? [])
    : [];

  const seasonal = mergeUniqueQueries(holiday, geoSeason);
  const available = usedSeasonalHeaders
    ? seasonal.filter(
        (query) => !usedSeasonalHeaders.has(normalizeQueryKey(query))
      )
    : seasonal;

  const sampledSeasonal =
    available.length > 1 ? sampleRandom(available, 1) : available;
  if (usedSeasonalHeaders && sampledSeasonal.length > 0) {
    usedSeasonalHeaders.add(normalizeQueryKey(sampledSeasonal[0]));
  }

  const combined = mergeUniqueQueries(sampledSeasonal, queries);
  return {
    queries: combined,
    seasonalQueries: new Set(sampledSeasonal.map(normalizeQueryKey))
  };
}

function seededShuffle<T>(values: T[], seed: string): T[] {
  const hash = createHash("sha1").update(seed).digest("hex");
  const result = [...values];
  let seedIndex = 0;

  for (let i = result.length - 1; i > 0; i -= 1) {
    const slice = hash.slice(seedIndex, seedIndex + 8);
    const fallback = createHash("sha1")
      .update(`${seed}:${i}`)
      .digest("hex")
      .slice(0, 8);
    const hex = slice.length === 8 ? slice : fallback;
    seedIndex = (seedIndex + 8) % hash.length;
    const rand = Number.parseInt(hex, 16);
    const j = rand % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export function pickSeasonalCategories(
  seed: string,
  categories: CategoryKey[],
  count: number
): CategoryKey[] {
  if (categories.length <= count) {
    return [...categories];
  }

  const shuffled = seededShuffle(categories, seed);
  return shuffled.slice(0, count);
}

export function estimateSearchCallsForQueries(
  category: CategoryKey,
  queries: string[],
  seasonalQueries: Set<string>,
  anchorCount: number
): number {
  if (queries.length === 0) {
    return 0;
  }

  const baseAnchors = LOW_PRIORITY_ANCHOR_CATEGORIES.has(category)
    ? 1
    : anchorCount;
  return queries.reduce((total, query) => {
    const normalized = normalizeQueryKey(query);
    const anchorsForQuery = seasonalQueries.has(normalized) ? 1 : baseAnchors;
    return total + anchorsForQuery;
  }, 0);
}

export function buildSeasonalQuerySections(
  grouped: Record<string, ScoredPlace[]>,
  maxPerQuery: number,
  maxHeaders: number
): Record<string, string> {
  const queryMap = new Map<string, { query: string; places: ScoredPlace[] }>();

  for (const places of Object.values(grouped)) {
    for (const place of places) {
      const queries = place.sourceQueries ?? [];
      for (const query of queries) {
        const key = normalizeQueryKey(query);
        const entry = queryMap.get(key);
        if (entry) {
          entry.places.push(place);
        } else {
          queryMap.set(key, { query, places: [place] });
        }
      }
    }
  }

  const chosen = sampleRandom(Array.from(queryMap.values()), maxHeaders);
  const sections: Record<string, string> = {};

  for (const { query, places } of chosen) {
    const list = formatPlaceList(places, maxPerQuery, true);
    if (!list || list.includes("(none found)")) {
      continue;
    }
    sections[query] = list;
  }

  return sections;
}
