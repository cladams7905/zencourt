import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import type { CommunityData } from "@web/src/types/market";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/logger";
import { Redis } from "@upstash/redis";
import {
  fetchPlaceDetails,
  fetchPlaces,
  PlaceDetailsResponse,
  type PlaceResult
} from "./google/placesClient";
import { getCommunityDataProvider } from "./perplexity/provider";
import {
  fetchPerplexityCityDescription,
  type CityDescriptionPayload
} from "./perplexity/cityDescription";
import {
  getPerplexityCommunityData,
  getPerplexityCommunityDataForCategories,
  getPerplexityMonthlyEventsSection,
  prefetchPerplexityCategories
} from "./perplexity/service";
import { GEO_SEASON_QUERY_PACK } from "./google/geographicQueries";
import { HOLIDAY_QUERY_PACK } from "./google/holidaySeasonQueries";
import {
  COMMUNITY_CACHE_KEY_PREFIX,
  DEFAULT_SEARCH_RADIUS_METERS,
  MAX_PLACE_DISTANCE_KM,
  DISTANCE_SCORE_WEIGHT,
  DISTANCE_SCORE_CAP_KM,
  SEARCH_ANCHOR_OFFSETS,
  CHAIN_NAME_BLACKLIST,
  CHAIN_FILTER_CATEGORIES,
  // Regional state sets
  PACIFIC_NORTHWEST_STATES,
  MOUNTAIN_STATES,
  DESERT_SOUTHWEST_STATES,
  GULF_COAST_STATES,
  ATLANTIC_SOUTH_STATES,
  MID_ATLANTIC_STATES,
  NEW_ENGLAND_STATES,
  GREAT_LAKES_STATES,
  CALIFORNIA_STATES,
  HAWAII_STATES,
  ALASKA_STATES,
  AUDIENCE_SEGMENT_ALIASES,
  NORMALIZED_AUDIENCE_SEGMENTS,
  NEIGHBORHOOD_REJECT_TERMS,
  NEIGHBORHOOD_QUERIES,
  CATEGORY_CONFIG,
  AUDIENCE_AUGMENT_CATEGORIES,
  getCategoryDisplayLimit,
  getCategoryMinRating,
  getCategoryMinReviews,
  getCategoryPoolMax,
  getAllAudienceAugmentQueries,
  getAudienceAugmentLimit,
  getCategoryFallbackQueries,
  getCategoryMinPrimaryResults,
  getCategoryTargetQueryCount,
  type AudienceSegment,
  type AudienceAugmentCategory,
  type CategoryKey
} from "./communityDataConfig";

const logger = createChildLogger(baseLogger, {
  module: "community-data-service"
});

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CITY_DESCRIPTION_MODEL = "claude-haiku-4-5-20251001";
const CITY_DESCRIPTION_MAX_TOKENS = 160;
const COMMUNITY_AUDIENCE_DELTA_TTL_SECONDS = 60 * 60 * 12;
const PLACE_DETAILS_CACHE_TTL_SECONDS = 60 * 60 * 12;

let redisClient: Redis | null | undefined;
let cachedCityDatasetPath: string | null | undefined;
let cachedCityRecords: CityRecord[] | null = null;
let cachedZipIndex: Map<string, CityRecord> | null = null;

type CityRecord = {
  city: string;
  state_id: string;
  county_name: string;
  lat: number;
  lng: number;
  population: number;
  zips: string;
};

type ScoredPlace = {
  name: string;
  rating: number;
  reviewCount: number;
  address: string;
  category: string;
  summary?: string;
  keywords?: string[];
  placeId?: string;
  distanceKm?: number;
  sourceQueries?: string[];
};

type AudienceDelta = Partial<Record<AudienceAugmentCategory, string>>;

/**
 * Cached pool of scored places for a category.
 * Stores ALL query results so we can randomly sample on each request.
 */
type CachedPlacePool = {
  items?: CachedPlacePoolItem[];
  placeIds?: string[];
  fetchedAt: string;
  queryCount: number;
};

type CachedPlacePoolItem = {
  placeId: string;
  sourceQueries: string[] | undefined;
};

type QueryOverrides = {
  minRating?: number;
  minReviews?: number;
};

const GENERIC_TYPE_KEYWORDS = new Set([
  "establishment",
  "point of interest",
  "food",
  "store",
  "place of worship",
  "locality",
  "neighborhood"
]);

type ClaudeMessageResponse = {
  content?: Array<{
    type?: string;
    text?: string;
  }>;
};

function normalizeAudienceSegment(segment?: string): AudienceSegment | undefined {
  if (!segment) {
    return undefined;
  }
  const normalized = AUDIENCE_SEGMENT_ALIASES[segment] ?? segment;
  return NORMALIZED_AUDIENCE_SEGMENTS.has(normalized as AudienceSegment)
    ? (normalized as AudienceSegment)
    : undefined;
}

function getQueryOverrides(
  category: string,
  query: string
): QueryOverrides | null {
  if (category === "education" && query.toLowerCase().includes("library")) {
    return { minReviews: 10 };
  }
  return null;
}

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    logger.warn(
      { hasUrl: Boolean(url), hasToken: Boolean(token) },
      "Upstash Redis env vars missing; cache disabled"
    );
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  logger.info("Upstash Redis client initialized (community data)");
  return redisClient;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getCommunityCacheKey(
  zipCode: string,
  city?: string | null,
  state?: string | null
): string {
  if (city && state) {
    return `${COMMUNITY_CACHE_KEY_PREFIX}:${zipCode}:${state.toUpperCase()}:${slugify(
      city
    )}`;
  }
  return `${COMMUNITY_CACHE_KEY_PREFIX}:${zipCode}`;
}

function getCommunityAudienceCacheKey(
  zipCode: string,
  audienceSegment: string,
  serviceAreas?: string[] | null,
  city?: string | null,
  state?: string | null
): string {
  const signature = buildServiceAreasSignature(serviceAreas);
  const base = `${getCommunityCacheKey(zipCode, city, state)}:aud:${audienceSegment}`;
  return signature ? `${base}:sa:${signature}` : base;
}

function getCommunityCategoryCacheKey(
  zipCode: string,
  category: string,
  city?: string | null,
  state?: string | null
): string {
  const base = getCommunityCacheKey(zipCode, city, state);
  return `${base}:cat:${category}`;
}

function getCommunitySeasonalCacheKey(
  zipCode: string,
  city?: string | null,
  state?: string | null
): string {
  return `${getCommunityCacheKey(zipCode, city, state)}:seasonal`;
}

function getPlaceDetailsCacheKey(placeId: string): string {
  return `${COMMUNITY_CACHE_KEY_PREFIX}:place:${placeId}`;
}

function getPlacePoolCacheKey(
  zipCode: string,
  category: string,
  audience?: string | null,
  serviceAreas?: string[] | null,
  city?: string | null,
  state?: string | null
): string {
  const base = city && state
    ? `${COMMUNITY_CACHE_KEY_PREFIX}:pool:${zipCode}:${state.toUpperCase()}:${slugify(city)}:${category}`
    : `${COMMUNITY_CACHE_KEY_PREFIX}:pool:${zipCode}:${category}`;
  const withAudience = audience ? `${base}:${audience}` : base;
  const signature = buildServiceAreasSignature(serviceAreas);
  return signature ? `${withAudience}:sa:${signature}` : withAudience;
}

function getSecondsUntilEndOfMonth(now = new Date()): number {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const nextMonthStart = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0));
  const diffMs = nextMonthStart.getTime() - now.getTime();
  return Math.max(60, Math.ceil(diffMs / 1000));
}

function getCommunityCacheTtlSeconds(): number {
  return getSecondsUntilEndOfMonth();
}

function isPoolStale(fetchedAt?: string): boolean {
  if (!fetchedAt) {
    return true;
  }
  const fetchedDate = new Date(fetchedAt);
  if (Number.isNaN(fetchedDate.getTime())) {
    return true;
  }
  const now = new Date();
  return (
    fetchedDate.getUTCFullYear() !== now.getUTCFullYear()
    || fetchedDate.getUTCMonth() !== now.getUTCMonth()
  );
}

function buildServiceAreasSignature(serviceAreas?: string[] | null): string | null {
  if (!serviceAreas || serviceAreas.length === 0) {
    return null;
  }
  const normalized = serviceAreas
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (normalized.length === 0) {
    return null;
  }
  normalized.sort();
  const joined = normalized.join("|");
  return createHash("sha1").update(joined).digest("hex").slice(0, 12);
}

function getCityDescriptionCacheKey(city: string, state: string): string {
  return `${COMMUNITY_CACHE_KEY_PREFIX}:citydesc:${state.toUpperCase()}:${slugify(
    city
  )}`;
}

type CityDescriptionCachePayload = {
  description: string;
  citations?: CityDescriptionPayload["citations"] | null;
};

async function getCachedCityDescription(
  city: string,
  state: string
): Promise<CityDescriptionCachePayload | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    return await redis.get<CityDescriptionCachePayload>(
      getCityDescriptionCacheKey(city, state)
    );
  } catch (error) {
    logger.warn(
      {
        city,
        state,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to read city description from cache"
    );
    return null;
  }
}

async function setCachedCityDescription(
  city: string,
  state: string,
  payload: CityDescriptionCachePayload
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(getCityDescriptionCacheKey(city, state), payload);
  } catch (error) {
    logger.warn(
      {
        city,
        state,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to write city description to cache"
    );
  }
}

function getClaudeApiKey(): string | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    logger.warn("ANTHROPIC_API_KEY is not configured; city description disabled");
    return null;
  }
  return apiKey;
}

function buildCityDescriptionPrompt(city: string, state: string): string {
  return `Write a 2-3 sentence high-quality description summarizing the city of ${city}, ${state}. This should include the general vibe of the area, places of interest, and its proximity to other things in the geographic region. Keep it brief but informative. Output only the sentences.`;
}

async function fetchCityDescription(
  city: string,
  state: string
): Promise<CityDescriptionCachePayload | null> {
  if (getCommunityDataProvider() === "perplexity") {
    return fetchPerplexityCityDescription(city, state);
  }
  const apiKey = getClaudeApiKey();
  if (!apiKey) {
    return null;
  }

  const response = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: CITY_DESCRIPTION_MODEL,
      max_tokens: CITY_DESCRIPTION_MAX_TOKENS,
      system:
        "You write concise, factual city descriptions for real estate marketing prompts.",
      messages: [
        {
          role: "user",
          content: buildCityDescriptionPrompt(city, state)
        }
      ]
    })
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    logger.warn(
      { status: response.status, errorPayload, city, state },
      "Claude city description request failed"
    );
    return null;
  }

  const payload = (await response.json()) as ClaudeMessageResponse;
  const text = payload.content?.find((item) => item.type === "text")?.text;
  if (!text) {
    return null;
  }

  const description = text.replace(/\s+/g, " ").trim();
  return description ? { description } : null;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === "\"") {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === "\"") {
        current += "\"";
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  result.push(current);
  return result;
}

function resolveCityDatasetPath(): string | null {
  if (cachedCityDatasetPath !== undefined) {
    return cachedCityDatasetPath;
  }
  const candidates = [
    path.join(process.cwd(), "apps/web/public/uscities.csv"),
    path.join(process.cwd(), "public/uscities.csv"),
    path.join(process.cwd(), "web/public/uscities.csv")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      cachedCityDatasetPath = candidate;
      return cachedCityDatasetPath;
    }
  }

  cachedCityDatasetPath = null;
  return cachedCityDatasetPath;
}

async function loadCityDataset(): Promise<CityRecord[]> {
  if (cachedCityRecords) {
    return cachedCityRecords;
  }

  const datasetPath = resolveCityDatasetPath();
  if (!datasetPath) {
    logger.warn("uscities.csv not found; community lookup disabled");
    cachedCityRecords = [];
    return cachedCityRecords;
  }

  const text = await readFile(datasetPath, "utf8");
  const lines = text.split("\n").filter(Boolean);
  if (lines.length === 0) {
    cachedCityRecords = [];
    return cachedCityRecords;
  }

  const header = parseCsvLine(lines[0]);
  const headerIndex = new Map(
    header.map((key, index) => [key.trim(), index])
  );

  const getValue = (row: string[], key: string): string =>
    row[headerIndex.get(key) ?? -1] ?? "";

  const records: CityRecord[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvLine(lines[i]);
    const lat = Number(getValue(row, "lat"));
    const lng = Number(getValue(row, "lng"));
    const population = Number(getValue(row, "population"));
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      continue;
    }

    records.push({
      city: getValue(row, "city"),
      state_id: getValue(row, "state_id"),
      county_name: getValue(row, "county_name"),
      lat,
      lng,
      population: Number.isNaN(population) ? 0 : population,
      zips: getValue(row, "zips")
    });
  }

  cachedCityRecords = records;
  return cachedCityRecords;
}

async function buildZipIndex(): Promise<Map<string, CityRecord>> {
  if (cachedZipIndex) {
    return cachedZipIndex;
  }

  const records = await loadCityDataset();
  const zipIndex = new Map<string, CityRecord>();

  for (const record of records) {
    if (!record.zips) {
      continue;
    }
    const zips = record.zips.split(/\s+/).filter(Boolean);
    for (const zip of zips) {
      const existing = zipIndex.get(zip);
      if (!existing || record.population > existing.population) {
        zipIndex.set(zip, record);
      }
    }
  }

  cachedZipIndex = zipIndex;
  return zipIndex;
}

async function resolveZipLocation(
  zipCode: string,
  preferredCity?: string | null,
  preferredState?: string | null
): Promise<CityRecord | null> {
  const normalizedCity = preferredCity?.trim().toLowerCase();
  const normalizedState = preferredState?.trim().toUpperCase();

  if (normalizedCity) {
    const records = await loadCityDataset();
    const matches = records.filter((record) => {
      if (!record.zips) {
        return false;
      }
      if (normalizedState && record.state_id !== normalizedState) {
        return false;
      }
      const cityMatch = record.city.trim().toLowerCase() === normalizedCity;
      if (!cityMatch) {
        return false;
      }
      return record.zips.split(/\s+/).includes(zipCode);
    });

    if (matches.length > 0) {
      return matches
        .slice()
        .sort((a, b) => b.population - a.population)[0];
    }
  }

  const zipIndex = await buildZipIndex();
  return zipIndex.get(zipCode) ?? null;
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

class DistanceCache {
  private cache = new Map<string, number>();

  constructor(
    private originLat: number,
    private originLng: number
  ) {}

  getDistanceKm(lat: number, lng: number): number {
    const key = `${lat.toFixed(5)}:${lng.toFixed(5)}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const distance = haversineKm(this.originLat, this.originLng, lat, lng);
    this.cache.set(key, distance);
    return distance;
  }
}

class ServiceAreaDistanceCache {
  private cache = new Map<string, number>();

  constructor(private centers: CityRecord[]) {}

  getDistanceKm(lat: number, lng: number): number {
    const key = `${lat.toFixed(5)}:${lng.toFixed(5)}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) {
      return cached;
    }
    const distance = this.centers.reduce((min, center) => {
      const value = haversineKm(center.lat, center.lng, lat, lng);
      return value < min ? value : min;
    }, Number.POSITIVE_INFINITY);
    this.cache.set(key, distance);
    return distance;
  }
}

type SearchAnchor = {
  lat: number;
  lng: number;
};

function getSearchAnchors(location: CityRecord): SearchAnchor[] {
  const anchors = SEARCH_ANCHOR_OFFSETS.map((offset) => ({
    lat: location.lat + offset.lat,
    lng: location.lng + offset.lng
  }));
  const seen = new Set<string>();
  const unique: SearchAnchor[] = [];
  for (const anchor of anchors) {
    const key = `${anchor.lat.toFixed(4)}:${anchor.lng.toFixed(4)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(anchor);
  }
  return unique.length > 0 ? unique : [{ lat: location.lat, lng: location.lng }];
}

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

const GEO_SEASON_MONTH_KEYS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december"
] as const;

type GeoSeasonMonthKey = (typeof GEO_SEASON_MONTH_KEYS)[number];

function getUtcMonthKey(date = new Date()): GeoSeasonMonthKey {
  return GEO_SEASON_MONTH_KEYS[date.getUTCMonth()] ?? "january";
}

function deriveGeoSeasonRegionKey(location: CityRecord): GeoSeasonRegionKey | null {
  const state = location.state_id;

  if (PACIFIC_NORTHWEST_STATES.has(state)) {
    return "pacific_northwest";
  }
  if (MOUNTAIN_STATES.has(state)) {
    return "mountain";
  }
  if (DESERT_SOUTHWEST_STATES.has(state)) {
    return "desert_southwest";
  }
  if (GULF_COAST_STATES.has(state)) {
    return "gulf_coast";
  }
  if (ATLANTIC_SOUTH_STATES.has(state)) {
    return "atlantic_south";
  }
  if (MID_ATLANTIC_STATES.has(state)) {
    return "mid_atlantic";
  }
  if (NEW_ENGLAND_STATES.has(state)) {
    return "new_england";
  }
  if (GREAT_LAKES_STATES.has(state)) {
    return "great_lakes";
  }
  if (CALIFORNIA_STATES.has(state)) {
    return "california";
  }
  if (HAWAII_STATES.has(state)) {
    return "hawaii";
  }
  if (ALASKA_STATES.has(state)) {
    return "alaska";
  }

  return null;
}

function normalizeQueryKey(query: string): string {
  return query.toLowerCase().trim();
}

function mergeUniqueQueries(base: string[], additions: string[]): string[] {
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

function buildSeasonalQueries(
  location: CityRecord,
  category: CategoryKey,
  queries: string[],
  date = new Date(),
  allowedCategories?: Set<CategoryKey>,
  usedSeasonalHeaders?: Set<string>
): { queries: string[]; seasonalQueries: Set<string> } {
  if (allowedCategories && !allowedCategories.has(category)) {
    return {
      queries: [...queries],
      seasonalQueries: new Set()
    };
  }
  const region = deriveGeoSeasonRegionKey(location);
  const monthKey = getUtcMonthKey(date);
  const holiday = HOLIDAY_QUERY_PACK[category]?.[monthKey] ?? [];
  const geoSeason = region
    ? (GEO_SEASON_QUERY_PACK[category]?.[region]?.[monthKey] ?? [])
    : [];
  const seasonal = mergeUniqueQueries(holiday, geoSeason);
  const available = usedSeasonalHeaders
    ? seasonal.filter((query) => !usedSeasonalHeaders.has(normalizeQueryKey(query)))
    : seasonal;
  const sampledSeasonal = available.length > 1 ? sampleRandom(available, 1) : available;
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
  const hashed = createHash("sha1").update(seed).digest("hex");
  const result = [...values];
  let seedIndex = 0;
  for (let i = result.length - 1; i > 0; i--) {
    const slice = hashed.slice(seedIndex, seedIndex + 8);
    const fallback = createHash("sha1").update(`${seed}:${i}`).digest("hex").slice(0, 8);
    const hex = slice.length === 8 ? slice : fallback;
    seedIndex = (seedIndex + 8) % hashed.length;
    const rand = Number.parseInt(hex, 16);
    const j = rand % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function pickSeasonalCategories(
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

const LOW_PRIORITY_ANCHOR_CATEGORIES = new Set<CategoryKey>([
  "entertainment",
  "attractions",
  "sports_rec",
  "arts_culture",
  "fitness_wellness",
  "shopping",
  "education",
  "community_events"
]);

const CATEGORY_FIELD_MAP: Record<CategoryKey, keyof CommunityData> = {
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

async function fetchPlacesWithAnchors(
  query: string,
  location: CityRecord,
  maxResults: number,
  category?: CategoryKey,
  forceSingleAnchor?: boolean
): Promise<PlaceResult[]> {
  const anchors = (forceSingleAnchor || (category && LOW_PRIORITY_ANCHOR_CATEGORIES.has(category)))
    ? [{ lat: location.lat, lng: location.lng }]
    : getSearchAnchors(location);
  const perAnchorMax = Math.max(3, Math.ceil(maxResults / anchors.length));
  const results = await Promise.all(
    anchors.map((anchor) =>
      fetchPlaces(query, anchor, perAnchorMax, DEFAULT_SEARCH_RADIUS_METERS)
    )
  );
  return results.flat();
}

function isChainPlace(name: string, category: string): boolean {
  if (category.startsWith("neighborhoods_")) {
    return false;
  }
  if (!CHAIN_FILTER_CATEGORIES.includes(category as (typeof CHAIN_FILTER_CATEGORIES)[number])) {
    return false;
  }
  const normalized = name.toLowerCase();
  return CHAIN_NAME_BLACKLIST.some((term) => normalized.includes(term));
}

function normalizeServiceAreaName(value: string): string {
  return value.trim().toLowerCase();
}

function resolveServiceAreaCenters(
  serviceAreas: string[] | null | undefined,
  location: CityRecord,
  records: CityRecord[]
): CityRecord[] | null {
  if (!serviceAreas || serviceAreas.length === 0) {
    return null;
  }

  const normalizedServiceAreas = serviceAreas
    .map((value) => value.trim())
    .filter(Boolean);
  if (normalizedServiceAreas.length === 0) {
    return null;
  }

  const byCity = new Map<string, CityRecord[]>();
  for (const record of records) {
    const key = normalizeServiceAreaName(record.city);
    const existing = byCity.get(key);
    if (existing) {
      existing.push(record);
    } else {
      byCity.set(key, [record]);
    }
  }

  const centers: CityRecord[] = [];
  for (const area of normalizedServiceAreas) {
    const [cityPart, statePart] = area.split(",").map((part) => part.trim());
    const cityKey = normalizeServiceAreaName(cityPart || area);
    const candidates = byCity.get(cityKey);
    if (!candidates || candidates.length === 0) {
      continue;
    }
    const withState = statePart
      ? candidates.filter(
          (record) =>
            record.state_id.toLowerCase() === statePart.toLowerCase()
        )
      : candidates;
    const sameState = withState.filter(
      (record) => record.state_id === location.state_id
    );
    const pool = sameState.length > 0 ? sameState : withState;
    const selected = pool
      .slice()
      .sort((a, b) => b.population - a.population)[0];
    if (selected) {
      centers.push(selected);
    }
  }

  return centers.length > 0 ? centers : null;
}

function buildNeighborhoodDetailList(
  items: ScoredPlace[]
): string {
  if (items.length === 0) {
    return "- (none found)";
  }
  const lines = rankPlaces(dedupePlaces(items))
    .slice(0, getCategoryDisplayLimit("neighborhoods"))
    .map((place) => `- ${place.name}`);
  return lines.length > 0 ? lines.join("\n") : "- (none found)";
}

function extractDisplayName(place: PlaceResult): string {
  return place.displayName?.text?.trim() || "";
}

function getPrimaryDistanceKm(
  place: PlaceResult,
  distanceCache: DistanceCache
): number | null {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  if (latitude === undefined || longitude === undefined) {
    return null;
  }
  return distanceCache.getDistanceKm(latitude, longitude);
}

function getServiceAreaDistanceKm(
  place: PlaceResult,
  serviceAreaCache?: ServiceAreaDistanceCache | null
): number | null {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  if (!serviceAreaCache || latitude === undefined || longitude === undefined) {
    return null;
  }
  return serviceAreaCache.getDistanceKm(latitude, longitude);
}

function toScoredPlaces(
  places: PlaceResult[] | undefined,
  category: string,
  distanceCache: DistanceCache,
  serviceAreaCache?: ServiceAreaDistanceCache | null,
  overrides?: QueryOverrides | null,
  sourceQuery?: string
): ScoredPlace[] {
  if (!places || places.length === 0) {
    return [];
  }

  return places
    .filter((place) => {
      const distance = getPrimaryDistanceKm(place, distanceCache);
      return distance === null || distance <= MAX_PLACE_DISTANCE_KM;
    })
    .filter((place) => {
      if (category.startsWith("neighborhoods_")) {
        const name = (place.displayName?.text || "").toLowerCase();
        if (NEIGHBORHOOD_REJECT_TERMS.some((term) => name.includes(term))) {
          return false;
        }
        return true;
      }
      if (isChainPlace(place.displayName?.text || "", category)) {
        return false;
      }
      const minRating =
        overrides?.minRating ?? getCategoryMinRating(category);
      const minReviews =
        overrides?.minReviews ?? getCategoryMinReviews(category);
      if (minRating > 0 && (place.rating ?? 0) < minRating) {
        return false;
      }
      if (minReviews > 0 && (place.userRatingCount ?? 0) < minReviews) {
        return false;
      }
      return true;
    })
    .map((place) => ({
      name: extractDisplayName(place),
      rating: place.rating ?? 0,
      reviewCount: place.userRatingCount ?? 0,
      address: place.formattedAddress ?? "",
      category,
      placeId: place.id,
      sourceQueries: sourceQuery ? [sourceQuery] : undefined,
      distanceKm:
        (() => {
          const primaryDistance = getPrimaryDistanceKm(place, distanceCache);
          const serviceDistance = getServiceAreaDistanceKm(
            place,
            serviceAreaCache
          );
          if (serviceDistance !== null) {
            return Math.min(serviceDistance, primaryDistance ?? serviceDistance);
          }
          return primaryDistance ?? undefined;
        })()
    }))
    .filter((place) => place.name);
}

function rankPlaces(places: ScoredPlace[]): ScoredPlace[] {
  return [...places].sort((a, b) => {
    const distanceA =
      a.distanceKm !== undefined
        ? Math.min(a.distanceKm, DISTANCE_SCORE_CAP_KM) * DISTANCE_SCORE_WEIGHT
        : 0;
    const distanceB =
      b.distanceKm !== undefined
        ? Math.min(b.distanceKm, DISTANCE_SCORE_CAP_KM) * DISTANCE_SCORE_WEIGHT
        : 0;
    const scoreA =
      Math.log10(a.reviewCount + 1) * 10 + (a.rating || 0) - distanceA;
    const scoreB =
      Math.log10(b.reviewCount + 1) * 10 + (b.rating || 0) - distanceB;
    return scoreB - scoreA;
  });
}

function dedupePlaces(places: ScoredPlace[]): ScoredPlace[] {
  const seen = new Map<string, ScoredPlace>();

  for (const place of places) {
    const key = place.placeId
      ? `place:${place.placeId}`
      : `${place.name}|${place.address}`
          .toLowerCase()
          .replace(/[^a-z0-9|]+/g, "");
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, place);
      continue;
    }
    if (place.summary && !existing.summary) {
      existing.summary = place.summary;
    }
    if (place.keywords && (!existing.keywords || existing.keywords.length === 0)) {
      existing.keywords = place.keywords;
    }
    if (place.sourceQueries && place.sourceQueries.length > 0) {
      const merged = new Set([
        ...(existing.sourceQueries ?? []),
        ...place.sourceQueries
      ]);
      existing.sourceQueries = Array.from(merged);
    }
    const existingScore = existing.reviewCount + existing.rating;
    const incomingScore = place.reviewCount + place.rating;
    if (incomingScore > existingScore) {
      existing.rating = place.rating;
      existing.reviewCount = place.reviewCount;
      if (place.address && !existing.address) {
        existing.address = place.address;
      }
      if (place.distanceKm !== undefined) {
        existing.distanceKm = place.distanceKm;
      }
      if (place.placeId) {
        existing.placeId = place.placeId;
      }
    }
  }

  return Array.from(seen.values());
}

async function fetchScoredPlacesForQueries(params: {
  queries: string[];
  category: string;
  maxResults: number;
  location: CityRecord;
  distanceCache: DistanceCache;
  serviceAreaCache?: ServiceAreaDistanceCache | null;
  seasonalQueries: Set<string>;
  overridesForQuery?: (query: string) => QueryOverrides | null | undefined;
}): Promise<ScoredPlace[]> {
  const {
    queries,
    category,
    maxResults,
    location,
    distanceCache,
    serviceAreaCache,
    seasonalQueries,
    overridesForQuery
  } = params;
  if (!queries || queries.length === 0) {
    return [];
  }
  const scored = await Promise.all(
    queries.map(async (query) => {
      const sourceQuery = seasonalQueries.has(normalizeQueryKey(query))
        ? query
        : undefined;
      const results = await fetchPlacesWithAnchors(
        query,
        location,
        maxResults,
        category as CategoryKey,
        Boolean(sourceQuery)
      );
      return toScoredPlaces(
        results,
        category,
        distanceCache,
        serviceAreaCache,
        overridesForQuery ? overridesForQuery(query) ?? undefined : undefined,
        sourceQuery
      );
    })
  );
  return scored.flat();
}

/**
 * Weighted random sampling from a pool of places.
 * Biases toward higher-quality places while still providing variety.
 *
 * Strategy:
 * - Divide pool into tiers: top 20%, middle 50%, bottom 30%
 * - Sample with bias: 60% from top, 30% from middle, 10% from bottom
 * - Shuffle final selection for variety in order
 */
function sampleFromPool<T>(pool: T[], count: number): T[] {
  if (pool.length <= count) {
    return shuffleArray([...pool]);
  }

  const topTierEnd = Math.max(1, Math.floor(pool.length * 0.2));
  const midTierEnd = Math.max(topTierEnd + 1, Math.floor(pool.length * 0.7));

  const topTier = pool.slice(0, topTierEnd);
  const midTier = pool.slice(topTierEnd, midTierEnd);
  const bottomTier = pool.slice(midTierEnd);

  const topCount = Math.min(Math.ceil(count * 0.6), topTier.length);
  const midCount = Math.min(Math.ceil(count * 0.3), midTier.length);
  const bottomCount = Math.min(count - topCount - midCount, bottomTier.length);

  const sampled: T[] = [
    ...sampleRandom(topTier, topCount),
    ...sampleRandom(midTier, midCount),
    ...sampleRandom(bottomTier, Math.max(0, bottomCount))
  ];

  if (sampled.length < count) {
    const sampledIds = new Set(sampled);
    const remaining = pool.filter((id) => !sampledIds.has(id));
    const needed = count - sampled.length;
    sampled.push(...sampleRandom(remaining, needed));
  }

  return shuffleArray(sampled.slice(0, count));
}

function sampleRandom<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) {
    return [...arr];
  }
  const shuffled = shuffleArray([...arr]);
  return shuffled.slice(0, count);
}

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatPlaceLine(place: ScoredPlace, includeKeywords: boolean): string {
  if (place.summary) {
    return `- ${place.name} — ${place.summary}`;
  }
  const keywordText =
    includeKeywords && place.keywords && place.keywords.length > 0
      ? ` — ${place.keywords.join(", ")}`
      : "";
  return `- ${place.name}${keywordText}`;
}

function formatPlaceList(
  places: ScoredPlace[],
  max: number,
  includeKeywords: boolean
): string {
  if (places.length === 0) {
    return "- (none found)";
  }

  return rankPlaces(dedupePlaces(places))
    .slice(0, max)
    .map((place) => formatPlaceLine(place, includeKeywords))
    .join("\n");
}

function buildSeasonalQuerySections(
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

  const queries = Array.from(queryMap.values());
  const chosen = sampleRandom(queries, maxHeaders);
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

function estimateSearchCallsForQueries(
  location: CityRecord,
  category: CategoryKey,
  queries: string[],
  seasonalQueries: Set<string>
): number {
  if (queries.length === 0) {
    return 0;
  }
  const anchorCount = getSearchAnchors(location).length;
  const baseAnchors = LOW_PRIORITY_ANCHOR_CATEGORIES.has(category) ? 1 : anchorCount;
  return queries.reduce((total, query) => {
    const normalized = normalizeQueryKey(query);
    const anchorsForQuery = seasonalQueries.has(normalized) ? 1 : baseAnchors;
    return total + anchorsForQuery;
  }, 0);
}

function trimList(list: string, max: number, stripKeywords: boolean): string {
  if (!list) {
    return "- (none found)";
  }
  const lines = list
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return "- (none found)";
  }
  if (lines.length === 1 && lines[0].includes("(none found)")) {
    return lines[0];
  }
  const trimmed = lines.slice(0, max);
  if (!stripKeywords) {
    return trimmed.join("\n");
  }
  return trimmed
    .map((line) => line.replace(/\s+—\s+[^—]+$/g, ""))
    .join("\n");
}

function buildPoolItems(
  places: ScoredPlace[],
  category: string
): CachedPlacePoolItem[] {
  const poolMax = getCategoryPoolMax(category);
  const ranked = rankPlaces(dedupePlaces(places));
  const limited = poolMax > 0 ? ranked.slice(0, poolMax) : ranked;
  return limited
    .map((place) =>
      place.placeId
        ? { placeId: place.placeId, sourceQueries: place.sourceQueries }
        : null
    )
    .filter((item): item is CachedPlacePoolItem => Boolean(item));
}

async function buildCategoryListWithDetails(
  category: string,
  places: ScoredPlace[],
  max: number
): Promise<string> {
  const deduped = rankPlaces(dedupePlaces(places));
  // Only fetch details for places we'll actually display
  // Search API already provides rating/reviewCount for ranking, details adds summary/keywords for display
  const toHydrate = deduped.slice(0, max);
  await Promise.all(
    toHydrate.map(async (place) => {
      if (place.summary || (place.keywords && place.keywords.length > 0)) {
        return;
      }
      if (!place.placeId) {
        return;
      }
      const details = await getPlaceDetailsCached(place.placeId);
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
      const { summary, keywords } = deriveSummaryKeywords(
        details
      );
      place.summary = summary;
      place.keywords = keywords;
    })
  );

  return formatPlaceList(toHydrate, max, true);
}

function deriveSummaryKeywords(
  details: PlaceDetailsResponse,
): { summary?: string; keywords?: string[] } {
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
  const keywords = normalized.length > 0
    ? Array.from(new Set(normalized)).slice(0, 4)
    : [];
  return keywords.length > 0 ? { keywords } : {};
}

async function hydratePlacesFromItems(
  items: CachedPlacePoolItem[],
  category: string
): Promise<ScoredPlace[]> {
  const results = await Promise.all(
    items.map(async (item): Promise<ScoredPlace | null> => {
      const { placeId, sourceQueries } = item;
      const details = await getPlaceDetailsCached(placeId);
      if (!details) {
        return null;
      }
      const name = details.displayName?.text?.trim() || "";
      if (!name) {
        return null;
      }
      const { summary, keywords } = deriveSummaryKeywords(details);
      const place: ScoredPlace = {
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
      return place;
    })
  );
  return results.filter((place) => place !== null);
}

/**
 * Get places for a category, using pool caching for variety.
 *
 * Flow:
 * 1. Check for cached pool
 * 2. If no pool, fetch all places and cache the full pool
 * 3. Sample from pool to get varied results each time
 * 4. Return sampled places for formatting
 */
async function getPooledCategoryPlaces(
  zipCode: string,
  category: string,
  fetchPlacesFn: () => Promise<ScoredPlace[]>,
  serviceAreas?: string[] | null,
  city?: string | null,
  state?: string | null,
  audience?: string | null
): Promise<CachedPlacePoolItem[]> {
  const refreshPool = async () => {
    try {
      const freshPlaces = await fetchPlacesFn();
      const items = buildPoolItems(freshPlaces, category);
      if (items.length > 0) {
        await setCachedPlacePool(
          zipCode,
          category,
          items,
          audience,
          serviceAreas,
          city,
          state
        );
      }
    } catch (error) {
      logger.warn(
        {
          zipCode,
          category,
          audience,
          error: error instanceof Error ? error.message : String(error)
        },
        "Failed to refresh place pool"
      );
    }
  };

  // Check for cached pool
  const cachedPool = await getCachedPlacePool(
    zipCode,
    category,
    audience,
    serviceAreas,
    city,
    state
  );

  let pool: CachedPlacePoolItem[];

  const cachedItems = cachedPool?.items && cachedPool.items.length > 0
    ? cachedPool.items
    : (cachedPool?.placeIds && cachedPool.placeIds.length > 0
        ? cachedPool.placeIds.map((placeId) => ({ placeId, sourceQueries: undefined }))
        : []);

  if (cachedItems.length > 0 && cachedPool && !isPoolStale(cachedPool.fetchedAt)) {
    pool = cachedItems;
  } else if (cachedItems.length > 0 && cachedPool) {
    pool = cachedItems;
    void refreshPool();
  } else {
    // Fetch fresh places and cache the full pool
    const freshPlaces = await fetchPlacesFn();
    const items = buildPoolItems(freshPlaces, category);
    if (items.length > 0) {
      await setCachedPlacePool(
        zipCode,
        category,
        items,
        audience,
        serviceAreas,
        city,
        state
      );
    }
    pool = items;
  }

  // Sample from the pool to get varied results
  const displayLimit = getCategoryDisplayLimit(category);
  return sampleFromPool(pool, displayLimit);
}

/**
 * Build audience-specific data using AUDIENCE-FIRST query pattern with pool caching.
 *
 * Flow:
 * 1. Check pool cache for audience+category combination
 * 2. If cache miss, run audience queries with geo/season localization
 * 3. If results < minPrimaryResults, run fallback queries to fill gaps
 * 4. Cache full pool, sample for variety
 */
async function buildAudienceAugmentDelta(
  location: CityRecord,
  audienceSegment: string,
  distanceCache: DistanceCache,
  serviceAreaCache: ServiceAreaDistanceCache | null | undefined,
  serviceAreas: string[] | null | undefined,
  zipCode: string,
  preferredCity?: string | null,
  preferredState?: string | null
): Promise<AudienceDelta> {
  const queriesByCategory = getAllAudienceAugmentQueries(audienceSegment);
  if (!queriesByCategory) {
    return {};
  }

  const seasonalCategories: CategoryKey[] = [];
  const allowedSeasonalCategories = new Set<CategoryKey>();
  const usedSeasonalHeaders = new Set<string>();
  const delta: AudienceDelta = {};
  let searchCallsEstimated = 0;
  let fallbackSearchCallsEstimated = 0;
  let detailsCallsEstimated = 0;
  const categoriesFetched: AudienceAugmentCategory[] = [];
  const categoriesFromCache: AudienceAugmentCategory[] = [];
  logger.info(
    {
      zipCode,
      audienceSegment,
      month: getUtcMonthKey(),
      seasonalCategories
    },
    "Selected seasonal categories for audience delta"
  );

  for (const category of AUDIENCE_AUGMENT_CATEGORIES) {
    const rawQueries = queriesByCategory[category] ?? [];
    const fallbackQueries = getCategoryFallbackQueries(category);
    const desiredQueryCount = getCategoryTargetQueryCount(category);
    let combinedQueries = rawQueries;
    if (rawQueries.length === 0) {
      combinedQueries = fallbackQueries.slice(0, desiredQueryCount);
    } else if (rawQueries.length < desiredQueryCount) {
      combinedQueries = mergeUniqueQueries(
        rawQueries,
        fallbackQueries.slice(0, desiredQueryCount - rawQueries.length)
      );
    }

    // Step 1: Apply geo/season packs to audience queries (LOCALIZED)
    const { queries: localizedQueries, seasonalQueries } = buildSeasonalQueries(
      location,
      category,
      combinedQueries,
      undefined,
      allowedSeasonalCategories,
      usedSeasonalHeaders
    );
    if (seasonalQueries.size > 0) {
      logger.info(
        {
          zipCode,
          audienceSegment,
          category,
          seasonalQueries: Array.from(seasonalQueries)
        },
        "Audience seasonal queries selected"
      );
    }

    if (localizedQueries.length === 0) {
      continue;
    }

    searchCallsEstimated += estimateSearchCallsForQueries(
      location,
      category,
      localizedQueries,
      seasonalQueries
    );
    if (fallbackQueries.length > 0) {
      fallbackSearchCallsEstimated += estimateSearchCallsForQueries(
        location,
        category,
        fallbackQueries,
        new Set()
      );
    }
    detailsCallsEstimated += getCategoryDisplayLimit(category);

    const maxPerQuery = getAudienceAugmentLimit(audienceSegment, category);

    // Create fetch function for pool caching
    const fetchAudiencePlaces = async (): Promise<ScoredPlace[]> => {
      // Run audience-specific queries FIRST (with optional fallback fill)
      let places = await fetchScoredPlacesForQueries({
        queries: localizedQueries,
        category,
        maxResults: maxPerQuery,
        location,
        distanceCache,
        serviceAreaCache,
        seasonalQueries
      });

      // Check if we need fallback queries
      const minPrimary = getCategoryMinPrimaryResults(category);
      const deduped = dedupePlaces(places);

      if (minPrimary <= 0 || deduped.length < minPrimary) {
        // Run fallback queries to fill gaps
        if (fallbackQueries.length > 0) {
          const fallbackPlaces = await fetchScoredPlacesForQueries({
            queries: fallbackQueries,
            category,
            maxResults: maxPerQuery,
            location,
            distanceCache,
            serviceAreaCache,
            seasonalQueries,
            overridesForQuery: (query) => getQueryOverrides(category, query)
          });
          // Merge: primary results first, then fallback
          places = [...places, ...fallbackPlaces];
        }
      }

      return places;
    };

    // Use pool caching: cache all results, sample for variety
    const sampledItems = await getPooledCategoryPlaces(
      zipCode,
      category,
      fetchAudiencePlaces,
      serviceAreas,
      preferredCity,
      preferredState,
      audienceSegment // Include audience in cache key
    );
    if (sampledItems.length > 0) {
      categoriesFromCache.push(category);
    } else {
      categoriesFetched.push(category);
    }

    const sampledPlaces = await hydratePlacesFromItems(sampledItems, category);
    // Skip buildCategoryListWithDetails - places already have details from hydration
    const formatted = formatPlaceList(sampledPlaces, sampledPlaces.length, true);
    if (!formatted.includes("(none found)")) {
      delta[category] = formatted;
    }
  }

  if (categoriesFetched.length > 0) {
    logger.info(
      {
        zipCode,
        audienceSegment,
        categoriesFromCache,
        categoriesFetched,
        searchCallsEstimated,
        fallbackSearchCallsEstimated,
        detailsCallsEstimated,
        totalCallsEstimated:
          searchCallsEstimated + detailsCallsEstimated,
        costEstimateUsd: Number(
          ((searchCallsEstimated + detailsCallsEstimated) * 0.02187).toFixed(4)
        ),
        seasonalCategories
      },
      "Community audience refresh estimated Google calls"
    );
  }

  return delta;
}

function applyAudienceDelta(
  communityData: CommunityData,
  delta: AudienceDelta
): CommunityData {
  const normalizeListKey = (line: string): string =>
    line
      .replace(/^\-\s*/g, "")
      .replace(/\s+—\s+.*$/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const parseListLines = (list: string): string[] =>
    list
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !line.includes("(none found)"));

  const mergeLists = (deltaList: string, baseList: string, max: number): string => {
    const deltaLines = parseListLines(deltaList);
    const baseLines = parseListLines(baseList);

    if (deltaLines.length === 0) {
      return trimList(baseList, max, false);
    }

    const merged: string[] = [];
    const seen = new Set<string>();

    for (const line of deltaLines) {
      const key = normalizeListKey(line);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(line);
    }

    for (const line of baseLines) {
      const key = normalizeListKey(line);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(line);
    }

    if (merged.length === 0) {
      return "- (none found)";
    }

    return merged.slice(0, max).join("\n");
  };

  let updated = { ...communityData };

  for (const category of Object.keys(delta) as AudienceAugmentCategory[]) {
    const field = CATEGORY_FIELD_MAP[category];
    const deltaList = delta[category];
    if (!deltaList || !field) {
      continue;
    }
    if (deltaList.includes("(none found)")) {
      continue;
    }
    const max = getCategoryDisplayLimit(category);
    const baseList = communityData[field];
    // Only merge string lists, skip non-string fields like seasonal_geo_sections
    if (typeof baseList !== "string") {
      continue;
    }
    updated = {
      ...updated,
      [field]: mergeLists(deltaList, baseList, max)
    };
  }

  return updated;
}

function trimCommunityDataLists(communityData: CommunityData): CommunityData {
  return {
    ...communityData,
    seasonal_geo_sections: communityData.seasonal_geo_sections ?? {},
    neighborhoods_list: trimList(
      communityData.neighborhoods_list,
      getCategoryDisplayLimit("neighborhoods"),
      true
    ),
    dining_list: trimList(
      communityData.dining_list,
      getCategoryDisplayLimit("dining"),
      false
    ),
    coffee_brunch_list: trimList(
      communityData.coffee_brunch_list,
      getCategoryDisplayLimit("coffee_brunch"),
      false
    ),
    nature_outdoors_list: trimList(
      communityData.nature_outdoors_list,
      getCategoryDisplayLimit("nature_outdoors"),
      false
    ),
    shopping_list: trimList(
      communityData.shopping_list,
      getCategoryDisplayLimit("shopping"),
      false
    ),
    entertainment_list: trimList(
      communityData.entertainment_list,
      getCategoryDisplayLimit("entertainment"),
      false
    ),
    arts_culture_list: trimList(
      communityData.arts_culture_list,
      getCategoryDisplayLimit("arts_culture"),
      false
    ),
    attractions_list: trimList(
      communityData.attractions_list,
      getCategoryDisplayLimit("attractions"),
      false
    ),
    sports_rec_list: trimList(
      communityData.sports_rec_list,
      getCategoryDisplayLimit("sports_rec"),
      false
    ),
    nightlife_social_list: trimList(
      communityData.nightlife_social_list,
      getCategoryDisplayLimit("nightlife_social"),
      false
    ),
    fitness_wellness_list: trimList(
      communityData.fitness_wellness_list,
      getCategoryDisplayLimit("fitness_wellness"),
      false
    ),
    education_list: trimList(
      communityData.education_list,
      getCategoryDisplayLimit("education"),
      false
    ),
    community_events_list: trimList(
      communityData.community_events_list,
      getCategoryDisplayLimit("community_events"),
      false
    )
  };
}

function countListItems(list: string | undefined): number {
  if (!list) {
    return 0;
  }
  return list
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes("(none found)")).length;
}

function getAudienceSkipCategories(delta: AudienceDelta | null): Set<CategoryKey> {
  const skip = new Set<CategoryKey>();
  if (!delta) {
    return skip;
  }

  for (const category of AUDIENCE_AUGMENT_CATEGORIES) {
    const list = delta[category];
    if (!list || list.includes("(none found)")) {
      continue;
    }
    const count = countListItems(list);
    const minPrimary = getCategoryMinPrimaryResults(category);
    if (minPrimary <= 0 || count >= minPrimary) {
      skip.add(category);
    }
  }

  return skip;
}


async function getCachedCommunityData(
  zipCode: string,
  city?: string | null,
  state?: string | null
): Promise<CommunityData | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get<CommunityData>(
      getCommunityCacheKey(zipCode, city, state)
    );
    return cached ?? null;
  } catch (error) {
    logger.warn(
      { zipCode, error: error instanceof Error ? error.message : String(error) },
      "Failed to read community data from cache"
    );
    return null;
  }
}

async function getCachedCommunityCategoryList(
  zipCode: string,
  category: string,
  city?: string | null,
  state?: string | null
): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get<string>(
      getCommunityCategoryCacheKey(zipCode, category, city, state)
    );
    return cached ?? null;
  } catch (error) {
    logger.warn(
      {
        zipCode,
        category,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to read community category list from cache"
    );
    return null;
  }
}

async function getCachedSeasonalSections(
  zipCode: string,
  city?: string | null,
  state?: string | null
): Promise<Record<string, string> | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get<Record<string, string>>(
      getCommunitySeasonalCacheKey(zipCode, city, state)
    );
    return cached ?? null;
  } catch (error) {
    logger.warn(
      { zipCode, error: error instanceof Error ? error.message : String(error) },
      "Failed to read seasonal sections from cache"
    );
    return null;
  }
}

async function getCachedPlaceDetails(
  placeId: string
): Promise<PlaceDetailsResponse | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get<PlaceDetailsResponse>(
      getPlaceDetailsCacheKey(placeId)
    );
    return cached ?? null;
  } catch (error) {
    logger.warn(
      { placeId, error: error instanceof Error ? error.message : String(error) },
      "Failed to read place details from cache"
    );
    return null;
  }
}

async function getCachedAudienceDelta(
  zipCode: string,
  audienceSegment: string,
  serviceAreas?: string[] | null,
  city?: string | null,
  state?: string | null
): Promise<AudienceDelta | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get<AudienceDelta>(
      getCommunityAudienceCacheKey(
        zipCode,
        audienceSegment,
        serviceAreas,
        city,
        state
      )
    );
    return cached ?? null;
  } catch (error) {
    logger.warn(
      {
        zipCode,
        audienceSegment,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to read community audience delta from cache"
    );
    return null;
  }
}

async function getCachedPlacePool(
  zipCode: string,
  category: string,
  audience?: string | null,
  serviceAreas?: string[] | null,
  city?: string | null,
  state?: string | null
): Promise<CachedPlacePool | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get<CachedPlacePool>(
      getPlacePoolCacheKey(
        zipCode,
        category,
        audience,
        serviceAreas,
        city,
        state
      )
    );
    return cached ?? null;
  } catch (error) {
    logger.warn(
      {
        zipCode,
        category,
        audience,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to read place pool from cache"
    );
    return null;
  }
}

async function setCachedCommunityData(
  zipCode: string,
  payload: CommunityData,
  city?: string | null,
  state?: string | null
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(getCommunityCacheKey(zipCode, city, state), payload, {
      ex: getCommunityCacheTtlSeconds()
    });
  } catch (error) {
    logger.warn(
      { zipCode, error: error instanceof Error ? error.message : String(error) },
      "Failed to write community data to cache"
    );
  }
}

async function setCachedCommunityCategoryList(
  zipCode: string,
  category: string,
  list: string,
  city?: string | null,
  state?: string | null
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(
      getCommunityCategoryCacheKey(zipCode, category, city, state),
      list,
      { ex: getCommunityCacheTtlSeconds() }
    );
  } catch (error) {
    logger.warn(
      {
        zipCode,
        category,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to write community category list to cache"
    );
  }
}

async function setCachedSeasonalSections(
  zipCode: string,
  sections: Record<string, string>,
  city?: string | null,
  state?: string | null
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(
      getCommunitySeasonalCacheKey(zipCode, city, state),
      sections,
      { ex: getCommunityCacheTtlSeconds() }
    );
  } catch (error) {
    logger.warn(
      { zipCode, error: error instanceof Error ? error.message : String(error) },
      "Failed to write seasonal sections to cache"
    );
  }
}

async function setCachedPlaceDetails(
  placeId: string,
  payload: PlaceDetailsResponse
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(getPlaceDetailsCacheKey(placeId), payload, {
      ex: PLACE_DETAILS_CACHE_TTL_SECONDS
    });
  } catch (error) {
    logger.warn(
      { placeId, error: error instanceof Error ? error.message : String(error) },
      "Failed to write place details to cache"
    );
  }
}

async function getPlaceDetailsCached(
  placeId: string
): Promise<PlaceDetailsResponse | null> {
  const cached = await getCachedPlaceDetails(placeId);
  if (cached) {
    return cached;
  }
  const details = await fetchPlaceDetails(placeId);
  if (details) {
    await setCachedPlaceDetails(placeId, details);
  }
  return details ?? null;
}

async function setCachedAudienceDelta(
  zipCode: string,
  audienceSegment: string,
  payload: AudienceDelta,
  serviceAreas?: string[] | null,
  city?: string | null,
  state?: string | null
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(
      getCommunityAudienceCacheKey(
        zipCode,
        audienceSegment,
        serviceAreas,
        city,
        state
      ),
      payload,
      { ex: COMMUNITY_AUDIENCE_DELTA_TTL_SECONDS }
    );
  } catch (error) {
    logger.warn(
      {
        zipCode,
        audienceSegment,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to write community audience delta to cache"
    );
  }
}

async function setCachedPlacePool(
  zipCode: string,
  category: string,
  items: CachedPlacePoolItem[],
  audience?: string | null,
  serviceAreas?: string[] | null,
  city?: string | null,
  state?: string | null
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  const payload: CachedPlacePool = {
    items,
    fetchedAt: new Date().toISOString(),
    queryCount: items.length
  };

  try {
    await redis.set(
      getPlacePoolCacheKey(
        zipCode,
        category,
        audience,
        serviceAreas,
        city,
        state
      ),
      payload,
      { ex: getCommunityCacheTtlSeconds() }
    );
  } catch (error) {
    logger.warn(
      {
        zipCode,
        category,
        audience,
        poolSize: items.length,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to write place pool to cache"
    );
  }
}

export async function getCommunityDataByZip(
  zipCode: string,
  serviceAreas?: string[] | null,
  preferredCity?: string | null,
  preferredState?: string | null,
  options?: {
    skipCategories?: Set<CategoryKey>;
    writeCache?: boolean;
  }
): Promise<CommunityData | null> {
  if (!zipCode) {
    return null;
  }

  if (getCommunityDataProvider() === "perplexity") {
    const location = await resolveZipLocation(
      zipCode,
      preferredCity,
      preferredState
    );
    if (!location) {
      logger.warn({ zipCode }, "Unable to resolve zip code to a city");
      return null;
    }
    const perplexityData = await getPerplexityCommunityData({
      zipCode,
      location: {
        city: location.city,
        state: location.state_id,
        lat: location.lat,
        lng: location.lng
      },
      serviceAreas
    });
    if (perplexityData) {
      return perplexityData;
    }
    logger.warn(
      { zipCode },
      "Perplexity community data unavailable; falling back to Google"
    );
  }

  const cached = await getCachedCommunityData(
    zipCode,
    preferredCity,
    preferredState
  );
  if (cached) {
    return cached;
  }

  const skipCategories = options?.skipCategories ?? new Set<CategoryKey>();
  const location = await resolveZipLocation(
    zipCode,
    preferredCity,
    preferredState
  );
  if (!location) {
    logger.warn({ zipCode }, "Unable to resolve zip code to a city");
    return null;
  }
  const distanceCache = new DistanceCache(location.lat, location.lng);
  const records = await loadCityDataset();
  if (records.length === 0) {
    logger.warn({ zipCode }, "City dataset empty; cannot resolve neighborhoods");
  }
  const serviceAreaCenters = resolveServiceAreaCenters(
    serviceAreas,
    location,
    records
  );
  const serviceAreaCache = serviceAreaCenters
    ? new ServiceAreaDistanceCache(serviceAreaCenters)
    : null;

  const neighborhoodQueries = NEIGHBORHOOD_QUERIES;
  // Base community data uses fallback queries (generic, non-audience-specific)
  // These provide baseline data; audience-specific queries override in getCommunityDataByZipAndAudience
  const seasonalCategoryPool = Object.keys(CATEGORY_CONFIG)
    .filter((key) => key !== "neighborhoods") as CategoryKey[];
  const allowedSeasonalCategories = new Set(
    pickSeasonalCategories(
      `${zipCode}:${getUtcMonthKey()}:base`,
      seasonalCategoryPool,
      4  // Reduced from 6 to limit seasonal query overhead
    )
  );
  const usedSeasonalHeaders = new Set<string>();
  logger.info(
    {
      zipCode,
      month: getUtcMonthKey(),
      seasonalCategories: Array.from(allowedSeasonalCategories)
    },
    "Selected seasonal categories for base refresh"
  );

  const cachedCategoryLists = new Map<CategoryKey, string>();
  const categoriesToFetch = new Set<CategoryKey>();

  await Promise.all(
    (Object.keys(CATEGORY_FIELD_MAP) as CategoryKey[])
      .filter((category) => !skipCategories.has(category))
      .map(async (category) => {
        const cachedList = await getCachedCommunityCategoryList(
          zipCode,
          category,
          preferredCity,
          preferredState
        );
        if (cachedList && countListItems(cachedList) > 0) {
          cachedCategoryLists.set(category, cachedList);
        } else {
          categoriesToFetch.add(category);
        }
      })
  );

  const categoryQueries = Object.entries(CATEGORY_CONFIG)
    .filter(([key]) => key !== "neighborhoods")
    .filter(([key]) => categoriesToFetch.has(key as CategoryKey))
    .map(([key, config]) => {
      const seasonal = buildSeasonalQueries(
        location,
        key as CategoryKey,
        config.fallbackQueries,
        undefined,
        allowedSeasonalCategories,
        usedSeasonalHeaders
      );
      if (seasonal.seasonalQueries.size > 0) {
        logger.info(
          {
            zipCode,
            category: key,
            seasonalQueries: Array.from(seasonal.seasonalQueries)
          },
          "Base seasonal queries selected"
        );
      }
      return {
        key,
        queries: seasonal.queries,
        seasonalQueries: seasonal.seasonalQueries,
        max: config.maxPerQuery
      };
    });

  // Check neighborhood cache before cost estimation
  const cachedNeighborhoodLists = new Map<string, string>();
  const neighborhoodsToFetch: typeof NEIGHBORHOOD_QUERIES = [];
  await Promise.all(
    neighborhoodQueries.map(async (category) => {
      const cachedList = await getCachedCommunityCategoryList(
        zipCode,
        category.key,
        preferredCity,
        preferredState
      );
      if (cachedList && countListItems(cachedList) > 0) {
        cachedNeighborhoodLists.set(category.key, cachedList);
      } else {
        neighborhoodsToFetch.push(category);
      }
    })
  );

  const baseDidRefresh = categoriesToFetch.size > 0 || neighborhoodsToFetch.length > 0;
  if (baseDidRefresh) {
    logger.info(
      {
        zipCode,
        categoriesFromCache: Array.from(cachedCategoryLists.keys()),
        categoriesFetched: Array.from(categoriesToFetch),
        skipCategories: Array.from(skipCategories)
      },
      "Community base categories cache vs fetch"
    );
  }

  const neighborhoodSearchCalls =
    neighborhoodsToFetch.length * getSearchAnchors(location).length;
  const categorySearchCalls = categoryQueries.reduce((total, category) => {
    return (
      total +
      estimateSearchCallsForQueries(
        location,
        category.key as CategoryKey,
        category.queries,
        category.seasonalQueries
      )
    );
  }, 0);
  const baseDetailCalls = (Object.entries(CATEGORY_CONFIG) as Array<
    [CategoryKey, { displayLimit?: number }]
  >)
    .filter(([key]) => key !== "neighborhoods")
    .filter(([key]) => categoriesToFetch.has(key))
    .reduce((sum, [key]) => sum + getCategoryDisplayLimit(key), 0);

  const baseTotalCalls = neighborhoodSearchCalls + categorySearchCalls + baseDetailCalls;
  const baseCostEstimate = Number((baseTotalCalls * 0.02187).toFixed(4));

  if (baseDidRefresh) {
    logger.info(
      {
        zipCode,
        searchCallsEstimated: neighborhoodSearchCalls + categorySearchCalls,
        detailsCallsEstimated: baseDetailCalls,
        totalCallsEstimated: baseTotalCalls,
        costEstimateUsd: baseCostEstimate,
        seasonalCategories: Array.from(allowedSeasonalCategories)
      },
      "Community base refresh estimated Google calls"
    );
  }

  // Fetch function for a category - used by pool caching
  const makeFetchFn = (category: {
    key: string;
    queries: string[];
    seasonalQueries: Set<string>;
    max: number;
  }) => async (): Promise<ScoredPlace[]> => {
    return fetchScoredPlacesForQueries({
      queries: category.queries,
      category: category.key,
      maxResults: category.max,
      location,
      distanceCache,
      serviceAreaCache,
      seasonalQueries: category.seasonalQueries,
      overridesForQuery: (query) => getQueryOverrides(category.key, query)
    });
  };

  // Fetch categories using pool caching for variety
  const categoryResults = await Promise.all(
    categoryQueries.map(async (category) => {
      const sampledItems = await getPooledCategoryPlaces(
        zipCode,
        category.key,
        makeFetchFn(category),
        serviceAreas,
        preferredCity,
        preferredState
      );
      const sampledPlaces = await hydratePlacesFromItems(
        sampledItems,
        category.key
      );
      return { key: category.key, places: sampledPlaces };
    })
  );

  // Neighborhoods don't use pool caching (they're location-specific landmarks)
  const neighborhoodResults = await Promise.all(
    neighborhoodsToFetch.map(async (category) => {
      const places = await fetchPlacesWithAnchors(
        category.query,
        location,
        category.max,
        category.key as CategoryKey
      );
      return {
        key: category.key,
        places: toScoredPlaces(
          places,
          category.key,
          distanceCache,
          serviceAreaCache,
          undefined,
          undefined
        )
      };
    })
  );

  const grouped: Record<string, ScoredPlace[]> = {};
  for (const result of [...categoryResults, ...neighborhoodResults]) {
    grouped[result.key] = result.places;
  }

  // Track which categories were already hydrated via hydratePlacesFromItems
  const alreadyHydratedCategories = new Set(categoryResults.map((r) => r.key));

  const listConfigs: Array<{
    category: CategoryKey;
    max: number;
  }> = (Object.keys(CATEGORY_FIELD_MAP) as CategoryKey[])
    .filter((category) => categoriesToFetch.has(category))
    .map((category) => ({
      category,
      max: getCategoryDisplayLimit(category)
    }));

  const listResults = await Promise.all(
    listConfigs.map(async ({ category, max }) => {
      const places = grouped[category] ?? [];
      // Skip buildCategoryListWithDetails for already-hydrated places
      if (alreadyHydratedCategories.has(category)) {
        return {
          category,
          value: formatPlaceList(places, max, true)
        };
      }
      // Neighborhoods and other non-pooled categories need details fetch
      return {
        category,
        value: await buildCategoryListWithDetails(category, places, max)
      };
    })
  );

  const listMap = new Map<keyof CommunityData, string>();
  for (const [category, value] of cachedCategoryLists.entries()) {
    const key = CATEGORY_FIELD_MAP[category];
    listMap.set(key, value);
  }
  for (const { category, value } of listResults) {
    const key = CATEGORY_FIELD_MAP[category];
    if (value && !value.includes("(none found)")) {
      listMap.set(key, value);
      await setCachedCommunityCategoryList(
        zipCode,
        category,
        value,
        preferredCity,
        preferredState
      );
    }
  }

  let seasonalGeoSections =
    (await getCachedSeasonalSections(
      zipCode,
      preferredCity,
      preferredState
    )) ?? null;
  if (!seasonalGeoSections) {
    seasonalGeoSections = buildSeasonalQuerySections(grouped, 3, 3);
    if (Object.keys(seasonalGeoSections).length > 0) {
      await setCachedSeasonalSections(
        zipCode,
        seasonalGeoSections,
        preferredCity,
        preferredState
      );
    }
  }

  // Build neighborhood lists from consolidated queries
  // neighborhoods_general covers general + relocators
  // neighborhoods_family covers family + luxury
  // neighborhoods_senior covers senior-specific
  const neighborhoodsGeneral =
    cachedNeighborhoodLists.get("neighborhoods_general") ??
    buildNeighborhoodDetailList(grouped.neighborhoods_general ?? []);
  const neighborhoodsFamily =
    cachedNeighborhoodLists.get("neighborhoods_family") ??
    buildNeighborhoodDetailList(grouped.neighborhoods_family ?? []);
  const neighborhoodsSenior =
    cachedNeighborhoodLists.get("neighborhoods_senior") ??
    buildNeighborhoodDetailList(grouped.neighborhoods_senior ?? []);

  if (neighborhoodsGeneral && !neighborhoodsGeneral.includes("(none found)")) {
    await setCachedCommunityCategoryList(
      zipCode,
      "neighborhoods_general",
      neighborhoodsGeneral,
      preferredCity,
      preferredState
    );
  }
  if (neighborhoodsFamily && !neighborhoodsFamily.includes("(none found)")) {
    await setCachedCommunityCategoryList(
      zipCode,
      "neighborhoods_family",
      neighborhoodsFamily,
      preferredCity,
      preferredState
    );
  }
  if (neighborhoodsSenior && !neighborhoodsSenior.includes("(none found)")) {
    await setCachedCommunityCategoryList(
      zipCode,
      "neighborhoods_senior",
      neighborhoodsSenior,
      preferredCity,
      preferredState
    );
  }

  // Derive luxury and relocators from consolidated queries
  const neighborhoodsLuxury = neighborhoodsFamily; // Family query includes luxury terms
  const neighborhoodsRelocators = neighborhoodsGeneral; // General query covers relocators
  const baseCommunityData: CommunityData = {
    city: location.city,
    state: location.state_id,
    zip_code: zipCode,
    data_timestamp: new Date().toISOString(),
    neighborhoods_list: neighborhoodsGeneral,
    neighborhoods_family_list: neighborhoodsFamily,
    neighborhoods_luxury_list: neighborhoodsLuxury,
    neighborhoods_senior_list: neighborhoodsSenior,
    neighborhoods_relocators_list: neighborhoodsRelocators,
    dining_list:
      skipCategories.has("dining")
        ? "- (none found)"
        : listMap.get("dining_list") ?? "- (none found)",
    coffee_brunch_list:
      skipCategories.has("coffee_brunch")
        ? "- (none found)"
        : listMap.get("coffee_brunch_list") ?? "- (none found)",
    nature_outdoors_list:
      skipCategories.has("nature_outdoors")
        ? "- (none found)"
        : listMap.get("nature_outdoors_list") ?? "- (none found)",
    shopping_list:
      skipCategories.has("shopping")
        ? "- (none found)"
        : listMap.get("shopping_list") ?? "- (none found)",
    entertainment_list:
      skipCategories.has("entertainment")
        ? "- (none found)"
        : listMap.get("entertainment_list") ?? "- (none found)",
    arts_culture_list:
      skipCategories.has("arts_culture")
        ? "- (none found)"
        : listMap.get("arts_culture_list") ?? "- (none found)",
    attractions_list:
      skipCategories.has("attractions")
        ? "- (none found)"
        : listMap.get("attractions_list") ?? "- (none found)",
    sports_rec_list:
      skipCategories.has("sports_rec")
        ? "- (none found)"
        : listMap.get("sports_rec_list") ?? "- (none found)",
    nightlife_social_list:
      skipCategories.has("nightlife_social")
        ? "- (none found)"
        : listMap.get("nightlife_social_list") ?? "- (none found)",
    fitness_wellness_list:
      skipCategories.has("fitness_wellness")
        ? "- (none found)"
        : listMap.get("fitness_wellness_list") ?? "- (none found)",
    education_list:
      skipCategories.has("education")
        ? "- (none found)"
        : listMap.get("education_list") ?? "- (none found)",
    community_events_list:
      skipCategories.has("community_events")
        ? "- (none found)"
        : listMap.get("community_events_list") ?? "- (none found)",
    seasonal_geo_sections: seasonalGeoSections ?? {}
  };

  if (options?.writeCache ?? true) {
    await setCachedCommunityData(
      zipCode,
      baseCommunityData,
      preferredCity,
      preferredState
    );
  }
  return baseCommunityData;
}

export async function getCommunityDataByZipAndAudience(
  zipCode: string,
  audienceSegment?: string,
  serviceAreas?: string[] | null,
  preferredCity?: string | null,
  preferredState?: string | null
): Promise<CommunityData | null> {
  const normalized = normalizeAudienceSegment(audienceSegment);
  if (getCommunityDataProvider() === "perplexity") {
    const location = await resolveZipLocation(
      zipCode,
      preferredCity,
      preferredState
    );
    if (!location) {
      logger.warn({ zipCode }, "Unable to resolve zip code to a city");
      return null;
    }
    const perplexityData = await getPerplexityCommunityData({
      zipCode,
      location: {
        city: location.city,
        state: location.state_id,
        lat: location.lat,
        lng: location.lng
      },
      audience: normalized,
      serviceAreas
    });
    if (perplexityData) {
      return perplexityData;
    }
    logger.warn(
      { zipCode, audience: normalized },
      "Perplexity community data unavailable; falling back to Google"
    );
  }
  if (!normalized) {
    return getCommunityDataByZip(
      zipCode,
      serviceAreas,
      preferredCity,
      preferredState
    );
  }

  const cachedDelta = await getCachedAudienceDelta(
    zipCode,
    normalized,
    serviceAreas,
    preferredCity,
    preferredState
  );
  let delta = cachedDelta;
  if (!delta) {
    const location = await resolveZipLocation(
      zipCode,
      preferredCity,
      preferredState
    );
    if (location) {
      const distanceCache = new DistanceCache(location.lat, location.lng);
      const records = await loadCityDataset();
      const serviceAreaCenters = resolveServiceAreaCenters(
        serviceAreas,
        location,
        records
      );
      const serviceAreaCache = serviceAreaCenters
        ? new ServiceAreaDistanceCache(serviceAreaCenters)
        : null;
      delta = await buildAudienceAugmentDelta(
        location,
        normalized,
        distanceCache,
        serviceAreaCache,
        serviceAreas,
        zipCode,
        preferredCity,
        preferredState
      );
      if (delta && Object.keys(delta).length > 0) {
        await setCachedAudienceDelta(
          zipCode,
          normalized,
          delta,
          serviceAreas,
          preferredCity,
          preferredState
        );
      }
    }
  }

  const skipCategories = getAudienceSkipCategories(delta);
  const base = await getCommunityDataByZip(
    zipCode,
    serviceAreas,
    preferredCity,
    preferredState,
    {
      skipCategories,
      writeCache: skipCategories.size === 0
    }
  );
  if (!base) {
    return null;
  }

  const merged = delta ? applyAudienceDelta(base, delta) : base;
  return buildAudienceCommunityData(
    trimCommunityDataLists(merged),
    normalized
  );
}

export async function getPerplexityCommunityDataByZipAndAudienceForCategories(
  zipCode: string,
  categories: CategoryKey[],
  audienceSegment?: string,
  serviceAreas?: string[] | null,
  preferredCity?: string | null,
  preferredState?: string | null,
  eventsSection?: { key: string; value: string } | null,
  options?: {
    forceRefresh?: boolean;
    avoidRecommendations?: Partial<Record<CategoryKey, string[]>> | null;
  }
): Promise<CommunityData | null> {
  if (!zipCode) {
    return null;
  }
  const normalizedAudience = normalizeAudienceSegment(audienceSegment);
  const location = await resolveZipLocation(
    zipCode,
    preferredCity,
    preferredState
  );
  if (!location) {
    logger.warn({ zipCode }, "Unable to resolve zip code to a city");
    return null;
  }
  return getPerplexityCommunityDataForCategories({
    zipCode,
    location: {
      city: location.city,
      state: location.state_id,
      lat: location.lat,
      lng: location.lng
    },
    audience: normalizedAudience,
    serviceAreas,
    categories,
    eventsSection,
    forceRefresh: options?.forceRefresh,
    avoidRecommendations: options?.avoidRecommendations
  });
}

export async function getPerplexityMonthlyEventsSectionByZip(
  zipCode: string,
  audienceSegment?: string,
  preferredCity?: string | null,
  preferredState?: string | null
): Promise<{ key: string; value: string } | null> {
  if (!zipCode) {
    return null;
  }
  const normalizedAudience = normalizeAudienceSegment(audienceSegment);
  const location = await resolveZipLocation(
    zipCode,
    preferredCity,
    preferredState
  );
  if (!location) {
    logger.warn({ zipCode }, "Unable to resolve zip code to a city");
    return null;
  }
  return getPerplexityMonthlyEventsSection({
    zipCode,
    location: {
      city: location.city,
      state: location.state_id,
      lat: location.lat,
      lng: location.lng
    },
    audience: normalizedAudience
  });
}

export async function prefetchPerplexityCategoriesByZip(
  zipCode: string,
  categories: CategoryKey[],
  audienceSegment?: string,
  serviceAreas?: string[] | null,
  preferredCity?: string | null,
  preferredState?: string | null
): Promise<void> {
  if (!zipCode) {
    return;
  }
  const normalizedAudience = normalizeAudienceSegment(audienceSegment);
  const location = await resolveZipLocation(
    zipCode,
    preferredCity,
    preferredState
  );
  if (!location) {
    logger.warn({ zipCode }, "Unable to resolve zip code to a city");
    return;
  }
  await prefetchPerplexityCategories({
    zipCode,
    location: {
      city: location.city,
      state: location.state_id,
      lat: location.lat,
      lng: location.lng
    },
    audience: normalizedAudience,
    serviceAreas,
    categories
  });
}

export async function getCityDescription(
  city?: string | null,
  state?: string | null
): Promise<string | null> {
  if (!city || !state) {
    return null;
  }

  const cached = await getCachedCityDescription(city, state);
  if (cached) {
    return cached.description;
  }

  const description = await fetchCityDescription(city, state);
  if (description) {
    await setCachedCityDescription(city, state, description);
    return description.description;
  }

  return null;
}

export function buildAudienceCommunityData(
  communityData: CommunityData,
  audienceSegment?: string
): CommunityData {
  const normalizedSegment = normalizeAudienceSegment(audienceSegment);
  let neighborhoodsDetail = communityData.neighborhoods_list;
  switch (normalizedSegment) {
    case "growing_families":
      neighborhoodsDetail = communityData.neighborhoods_family_list;
      break;
    case "luxury_buyers":
      neighborhoodsDetail = communityData.neighborhoods_luxury_list;
      break;
    case "active_retirees":
      neighborhoodsDetail = communityData.neighborhoods_senior_list;
      break;
    case "investors_relocators":
      neighborhoodsDetail = communityData.neighborhoods_relocators_list;
      break;
    default:
      neighborhoodsDetail = communityData.neighborhoods_list;
  }
  return {
    ...communityData,
    neighborhoods_list: neighborhoodsDetail
  };
}
