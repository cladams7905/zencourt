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
  type PlaceResult
} from "./communityPlacesClient";
import { KeywordExtractor } from "./communityKeywords";
import {
  COMMUNITY_CACHE_KEY_PREFIX,
  DEFAULT_COMMUNITY_TTL_DAYS,
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
  GEO_QUERY_PACKS,
  SEASON_QUERY_PACKS,
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
  type AudienceSegment,
  type AudienceAugmentCategory,
  type CategoryKey
} from "./communityDataConfig";

const keywordExtractor = new KeywordExtractor();

const logger = createChildLogger(baseLogger, {
  module: "community-data-service"
});

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CITY_DESCRIPTION_MODEL = "claude-haiku-4-5-20251001";
const CITY_DESCRIPTION_MAX_TOKENS = 160;
const COMMUNITY_AUDIENCE_DELTA_TTL_SECONDS = 60 * 60 * 24;
const PLACE_POOL_REFRESH_DAYS = 14;

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
  website?: string;
  summary?: string;
  keywords?: string[];
  placeId?: string;
  distanceKm?: number;
};

type AudienceDelta = Partial<Record<AudienceAugmentCategory, string>>;

type PlaceDetailsCache = {
  summary?: string;
  keywords?: string[];
};

/**
 * Cached pool of scored places for a category.
 * Stores ALL query results so we can randomly sample on each request.
 */
type CachedPlacePool = {
  places: ScoredPlace[];
  fetchedAt: string;
  queryCount: number;
};

type QueryOverrides = {
  minRating?: number;
  minReviews?: number;
};

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

function getPlaceDetailsCacheKey(
  placeId: string,
  category: string
): string {
  return `${COMMUNITY_CACHE_KEY_PREFIX}:place:${placeId}:${category}`;
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

function getCommunityCacheTtlSeconds(): number {
  const override = process.env.COMMUNITY_CACHE_TTL_DAYS;
  if (!override) {
    return DEFAULT_COMMUNITY_TTL_DAYS * 24 * 60 * 60;
  }

  const parsed = Number.parseInt(override, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_COMMUNITY_TTL_DAYS * 24 * 60 * 60;
  }

  return parsed * 24 * 60 * 60;
}

function isPoolStale(fetchedAt?: string): boolean {
  if (!fetchedAt) {
    return true;
  }
  const timestamp = Date.parse(fetchedAt);
  if (Number.isNaN(timestamp)) {
    return true;
  }
  const ageMs = Date.now() - timestamp;
  const maxAgeMs = PLACE_POOL_REFRESH_DAYS * 24 * 60 * 60 * 1000;
  return ageMs > maxAgeMs;
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

async function getCachedCityDescription(
  city: string,
  state: string
): Promise<string | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    return await redis.get<string>(getCityDescriptionCacheKey(city, state));
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
  payload: string
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
): Promise<string | null> {
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

  return text.replace(/\s+/g, " ").trim() || null;
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

type GeoPackKey =
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
  | "alaska"
  | "warm"
  | "cold";

type SeasonKey = "winter" | "spring" | "summer" | "fall";

/**
 * Derive geo pack keys based on state and latitude.
 * Each state maps to exactly ONE regional pack, plus optional warm/cold climate modifier.
 */
function deriveGeoPackKeys(location: CityRecord): GeoPackKey[] {
  const packs: GeoPackKey[] = [];
  const state = location.state_id;

  // Regional packs - each state belongs to exactly one region
  if (PACIFIC_NORTHWEST_STATES.has(state)) {
    packs.push("pacific_northwest");
  } else if (MOUNTAIN_STATES.has(state)) {
    packs.push("mountain");
  } else if (DESERT_SOUTHWEST_STATES.has(state)) {
    packs.push("desert_southwest");
  } else if (GULF_COAST_STATES.has(state)) {
    packs.push("gulf_coast");
  } else if (ATLANTIC_SOUTH_STATES.has(state)) {
    packs.push("atlantic_south");
  } else if (MID_ATLANTIC_STATES.has(state)) {
    packs.push("mid_atlantic");
  } else if (NEW_ENGLAND_STATES.has(state)) {
    packs.push("new_england");
  } else if (GREAT_LAKES_STATES.has(state)) {
    packs.push("great_lakes");
  } else if (CALIFORNIA_STATES.has(state)) {
    packs.push("california");
  } else if (HAWAII_STATES.has(state)) {
    packs.push("hawaii");
  } else if (ALASKA_STATES.has(state)) {
    packs.push("alaska");
  }

  // Climate modifiers (can supplement regional pack)
  // Warm: subtropical regions (lat <= 32)
  // Cold: northern regions (lat >= 44)
  if (location.lat <= 32) {
    packs.push("warm");
  } else if (location.lat >= 44) {
    packs.push("cold");
  }

  return packs;
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

function applyGeoQueryPacks(
  location: CityRecord,
  category: CategoryKey,
  queries: string[]
): string[] {
  const packs = deriveGeoPackKeys(location);
  if (packs.length === 0) {
    return queries;
  }
  const packQueries = packs.flatMap(
    (pack) => GEO_QUERY_PACKS[category]?.[pack] ?? []
  );
  return mergeUniqueQueries(queries, packQueries);
}

function deriveSeason(location: CityRecord, date = new Date()): SeasonKey {
  const month = date.getMonth(); // 0-11
  const isNorthern = location.lat >= 40;
  const isSouthern = location.lat <= 30;

  if (isNorthern) {
    if (month <= 1 || month === 11) return "winter";
    if (month >= 2 && month <= 4) return "spring";
    if (month >= 5 && month <= 7) return "summer";
    return "fall";
  }

  if (isSouthern) {
    if (month <= 1 || month === 11) return "fall";
    if (month >= 2 && month <= 4) return "spring";
    if (month >= 5 && month <= 8) return "summer";
    return "fall";
  }

  if (month <= 1 || month === 11) return "winter";
  if (month >= 2 && month <= 4) return "spring";
  if (month >= 5 && month <= 7) return "summer";
  return "fall";
}

function applySeasonQueryPacks(
  location: CityRecord,
  category: CategoryKey,
  queries: string[]
): string[] {
  const season = deriveSeason(location);
  const seasonal = SEASON_QUERY_PACKS[category]?.[season] ?? [];
  return mergeUniqueQueries(seasonal, queries);
}

async function fetchPlacesWithAnchors(
  query: string,
  location: CityRecord,
  maxResults: number
): Promise<PlaceResult[]> {
  const anchors = getSearchAnchors(location);
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

function getPlaceDistanceKm(
  place: PlaceResult,
  distanceCache: DistanceCache,
  serviceAreaCache?: ServiceAreaDistanceCache | null
): number | null {
  const latitude = place.location?.latitude;
  const longitude = place.location?.longitude;
  if (latitude === undefined || longitude === undefined) {
    return null;
  }
  if (serviceAreaCache) {
    return serviceAreaCache.getDistanceKm(latitude, longitude);
  }
  return distanceCache.getDistanceKm(latitude, longitude);
}

function toScoredPlaces(
  places: PlaceResult[] | undefined,
  category: string,
  distanceCache: DistanceCache,
  serviceAreaCache?: ServiceAreaDistanceCache | null,
  overrides?: QueryOverrides | null
): ScoredPlace[] {
  if (!places || places.length === 0) {
    return [];
  }

  return places
    .filter((place) => {
      const distance = getPlaceDistanceKm(
        place,
        distanceCache,
        serviceAreaCache
      );
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
      website: place.websiteUri,
      placeId: place.id,
      distanceKm:
        getPlaceDistanceKm(place, distanceCache, serviceAreaCache) ?? undefined
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
  const seen = new Set<string>();
  const result: ScoredPlace[] = [];

  for (const place of places) {
    const key = `${place.name}|${place.address}`
      .toLowerCase()
      .replace(/[^a-z0-9|]+/g, "");
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(place);
  }

  return result;
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
function sampleFromPool(pool: ScoredPlace[], count: number): ScoredPlace[] {
  if (pool.length <= count) {
    // Pool smaller than requested, shuffle and return all
    return shuffleArray([...pool]);
  }

  // Sort by quality score (same logic as rankPlaces)
  const sorted = [...pool].sort((a, b) => {
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

  // Define tier boundaries
  const topTierEnd = Math.max(1, Math.floor(sorted.length * 0.2));
  const midTierEnd = Math.max(topTierEnd + 1, Math.floor(sorted.length * 0.7));

  const topTier = sorted.slice(0, topTierEnd);
  const midTier = sorted.slice(topTierEnd, midTierEnd);
  const bottomTier = sorted.slice(midTierEnd);

  // Calculate how many to sample from each tier
  const topCount = Math.min(Math.ceil(count * 0.6), topTier.length);
  const midCount = Math.min(Math.ceil(count * 0.3), midTier.length);
  const bottomCount = Math.min(count - topCount - midCount, bottomTier.length);

  // Random sample from each tier
  const sampled: ScoredPlace[] = [
    ...sampleRandom(topTier, topCount),
    ...sampleRandom(midTier, midCount),
    ...sampleRandom(bottomTier, Math.max(0, bottomCount))
  ];

  // If we still need more (due to small tiers), fill from remaining
  if (sampled.length < count) {
    const sampledIds = new Set(sampled.map((p) => p.placeId || p.name));
    const remaining = sorted.filter(
      (p) => !sampledIds.has(p.placeId || p.name)
    );
    const needed = count - sampled.length;
    sampled.push(...sampleRandom(remaining, needed));
  }

  // Shuffle final result so order varies
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

async function buildCategoryListWithDetails(
  category: string,
  places: ScoredPlace[],
  max: number
): Promise<string> {
  const deduped = rankPlaces(dedupePlaces(places));
  const detailResults = await Promise.all(
    deduped.map(async (place) => {
      if (!place.placeId) {
        return { place, summary: "", keywords: [] as string[] };
      }
      const details = await fetchPlaceDetailsKeywords(place.placeId, category);
      return {
        place,
        summary: details.summary ?? "",
        keywords: details.keywords ?? []
      };
    })
  );
  for (const { place, summary, keywords } of detailResults) {
    place.summary = summary || undefined;
    place.keywords = keywords;
  }

  return formatPlaceList(deduped, max, true);
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
): Promise<ScoredPlace[]> {
  const refreshPool = async () => {
    try {
      const freshPlaces = await fetchPlacesFn();
      const dedupedPool = dedupePlaces(freshPlaces);
      if (dedupedPool.length > 0) {
        await setCachedPlacePool(
          zipCode,
          category,
          dedupedPool,
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

  let pool: ScoredPlace[];

  if (cachedPool && cachedPool.places.length > 0 && !isPoolStale(cachedPool.fetchedAt)) {
    pool = cachedPool.places;
  } else if (cachedPool && cachedPool.places.length > 0) {
    pool = cachedPool.places;
    void refreshPool();
  } else {
    // Fetch fresh places and cache the full pool
    const freshPlaces = await fetchPlacesFn();
    const dedupedPool = dedupePlaces(freshPlaces);
    if (dedupedPool.length > 0) {
      await setCachedPlacePool(
        zipCode,
        category,
        dedupedPool,
        audience,
        serviceAreas,
        city,
        state
      );
    }
    pool = dedupedPool;
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

  const delta: AudienceDelta = {};

  for (const category of AUDIENCE_AUGMENT_CATEGORIES) {
    const rawQueries = queriesByCategory[category] ?? [];

    // Step 1: Apply geo/season packs to audience queries (LOCALIZED)
    const localizedQueries = applySeasonQueryPacks(
      location,
      category,
      applyGeoQueryPacks(location, category, rawQueries)
    );

    if (localizedQueries.length === 0) {
      continue;
    }

    const maxPerQuery = getAudienceAugmentLimit(audienceSegment, category);

    // Create fetch function for pool caching
    const fetchAudiencePlaces = async (): Promise<ScoredPlace[]> => {
      // Run audience-specific queries FIRST
      const primaryResults = await Promise.all(
        localizedQueries.map((query: string) =>
          fetchPlacesWithAnchors(query, location, maxPerQuery)
        )
      );

      let places = toScoredPlaces(
        primaryResults.flat(),
        category,
        distanceCache,
        serviceAreaCache
      );

      // Check if we need fallback queries
      const minPrimary = getCategoryMinPrimaryResults(category);
      const deduped = dedupePlaces(places);

      if (minPrimary <= 0 || deduped.length < minPrimary) {
        // Run fallback queries to fill gaps
        const fallbackQueries = getCategoryFallbackQueries(category);
        if (fallbackQueries.length > 0) {
          const fallbackScored = await Promise.all(
            fallbackQueries.map(async (query: string) => {
              const overrides = getQueryOverrides(category, query);
              const results = await fetchPlacesWithAnchors(
                query,
                location,
                maxPerQuery
              );
              return toScoredPlaces(
                results,
                category,
                distanceCache,
                serviceAreaCache,
                overrides
              );
            })
          );
          const fallbackPlaces = fallbackScored.flat();
          // Merge: primary results first, then fallback
          places = [...places, ...fallbackPlaces];
        }
      }

      return places;
    };

    // Use pool caching: cache all results, sample for variety
    const sampled = await getPooledCategoryPlaces(
      zipCode,
      category,
      fetchAudiencePlaces,
      serviceAreas,
      preferredCity,
      preferredState,
      audienceSegment // Include audience in cache key
    );

    const formatted = await buildCategoryListWithDetails(
      category,
      sampled,
      sampled.length // Already sampled to display limit
    );
    if (!formatted.includes("(none found)")) {
      delta[category] = formatted;
    }
  }

  return delta;
}

function applyAudienceDelta(
  communityData: CommunityData,
  delta: AudienceDelta
): CommunityData {
  const fieldMap: Record<AudienceAugmentCategory, keyof CommunityData> = {
    dining: "dining_list",
    nature_outdoors: "nature_outdoors_list",
    entertainment: "entertainment_list",
    sports_rec: "sports_rec_list",
    fitness_wellness: "fitness_wellness_list",
    shopping: "shopping_list"
  };

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
    const field = fieldMap[category];
    const deltaList = delta[category];
    if (!deltaList || !field) {
      continue;
    }
    if (deltaList.includes("(none found)")) {
      continue;
    }
    const max = getCategoryDisplayLimit(category);
    const baseList = communityData[field];
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


async function fetchPlaceDetailsKeywords(
  placeId: string,
  category: string
): Promise<PlaceDetailsCache> {
  const cached = await getCachedPlaceDetails(placeId, category);
  if (cached) {
    return cached;
  }

  const details = await fetchPlaceDetails(placeId);
  if (!details) {
    return { keywords: [] };
  }

  const summary = details.generativeSummary?.overview?.text?.trim();
  if (summary) {
    const payload = { summary };
    await setCachedPlaceDetails(placeId, category, payload);
    return payload;
  }

  // Use the unified KeywordExtractor with details only.
  // Base lists avoid type/name keywords unless details are fetched.
  const keywords = keywordExtractor.extract({
    place: { id: placeId } as PlaceResult, // Minimal placeholder
    category,
    details
  });

  const payload = { keywords };
  await setCachedPlaceDetails(placeId, category, payload);
  return payload;
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

async function getCachedPlaceDetails(
  placeId: string,
  category: string
): Promise<PlaceDetailsCache | null> {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  try {
    const cached = await redis.get<PlaceDetailsCache>(
      getPlaceDetailsCacheKey(placeId, category)
    );
    return cached ?? null;
  } catch (error) {
    logger.warn(
      {
        placeId,
        category,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to read place details from cache"
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

async function setCachedPlaceDetails(
  placeId: string,
  category: string,
  payload: PlaceDetailsCache
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  try {
    await redis.set(
      getPlaceDetailsCacheKey(placeId, category),
      payload,
      { ex: getCommunityCacheTtlSeconds() }
    );
  } catch (error) {
    logger.warn(
      {
        placeId,
        category,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to write place details to cache"
    );
  }
}

async function setCachedPlacePool(
  zipCode: string,
  category: string,
  places: ScoredPlace[],
  audience?: string | null,
  serviceAreas?: string[] | null,
  city?: string | null,
  state?: string | null
): Promise<void> {
  const redis = getRedisClient();
  if (!redis) {
    return;
  }

  const poolMax = getCategoryPoolMax(category);
  const ranked = rankPlaces(dedupePlaces(places));
  const limited = poolMax > 0 ? ranked.slice(0, poolMax) : ranked;
  const minimized = limited.map((place) => ({
    name: place.name,
    rating: place.rating,
    reviewCount: place.reviewCount,
    address: place.address,
    category: place.category,
    placeId: place.placeId,
    distanceKm: place.distanceKm
  }));

  const payload: CachedPlacePool = {
    places: minimized,
    fetchedAt: new Date().toISOString(),
    queryCount: minimized.length
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
        poolSize: places.length,
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
  preferredState?: string | null
): Promise<CommunityData | null> {
  if (!zipCode) {
    return null;
  }

  const cached = await getCachedCommunityData(
    zipCode,
    preferredCity,
    preferredState
  );
  if (cached) {
    return cached;
  }

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
  const categoryQueries = Object.entries(CATEGORY_CONFIG)
    .filter(([key]) => key !== "neighborhoods")
    .map(([key, config]) => ({
      key,
      queries: applySeasonQueryPacks(
        location,
        key as CategoryKey,
        applyGeoQueryPacks(location, key as CategoryKey, config.fallbackQueries)
      ),
      max: config.maxPerQuery
    }));

  // Fetch function for a category - used by pool caching
  const makeFetchFn = (category: {
    key: string;
    queries: string[];
    max: number;
  }) => async (): Promise<ScoredPlace[]> => {
    const scored = await Promise.all(
      category.queries.map(async (query) => {
        const overrides = getQueryOverrides(category.key, query);
        const results = await fetchPlacesWithAnchors(
          query,
          location,
          category.max
        );
        return toScoredPlaces(
          results,
          category.key,
          distanceCache,
          serviceAreaCache,
          overrides
        );
      })
    );
    return scored.flat();
  };

  // Fetch categories using pool caching for variety
  const categoryResults = await Promise.all(
    categoryQueries.map(async (category) => {
      const sampled = await getPooledCategoryPlaces(
        zipCode,
        category.key,
        makeFetchFn(category),
        serviceAreas,
        preferredCity,
        preferredState
      );
      return { key: category.key, places: sampled };
    })
  );

  // Neighborhoods don't use pool caching (they're location-specific landmarks)
  const neighborhoodResults = await Promise.all(
    neighborhoodQueries.map(async (category) => {
      const places = await fetchPlacesWithAnchors(
        category.query,
        location,
        category.max
      );
      return {
        key: category.key,
        places: toScoredPlaces(places, category.key, distanceCache, serviceAreaCache)
      };
    })
  );

  const grouped: Record<string, ScoredPlace[]> = {};
  for (const result of [...categoryResults, ...neighborhoodResults]) {
    grouped[result.key] = result.places;
  }

  const listConfigs: Array<{
    key: keyof CommunityData;
    category: string;
    max: number;
  }> = [
    {
      key: "dining_list",
      category: "dining",
      max: getCategoryDisplayLimit("dining")
    },
    {
      key: "coffee_brunch_list",
      category: "coffee_brunch",
      max: getCategoryDisplayLimit("coffee_brunch")
    },
    {
      key: "nature_outdoors_list",
      category: "nature_outdoors",
      max: getCategoryDisplayLimit("nature_outdoors")
    },
    {
      key: "entertainment_list",
      category: "entertainment",
      max: getCategoryDisplayLimit("entertainment")
    },
    {
      key: "attractions_list",
      category: "attractions",
      max: getCategoryDisplayLimit("attractions")
    },
    {
      key: "sports_rec_list",
      category: "sports_rec",
      max: getCategoryDisplayLimit("sports_rec")
    },
    {
      key: "arts_culture_list",
      category: "arts_culture",
      max: getCategoryDisplayLimit("arts_culture")
    },
    {
      key: "nightlife_social_list",
      category: "nightlife_social",
      max: getCategoryDisplayLimit("nightlife_social")
    },
    {
      key: "fitness_wellness_list",
      category: "fitness_wellness",
      max: getCategoryDisplayLimit("fitness_wellness")
    },
    {
      key: "shopping_list",
      category: "shopping",
      max: getCategoryDisplayLimit("shopping")
    },
    {
      key: "education_list",
      category: "education",
      max: getCategoryDisplayLimit("education")
    },
    {
      key: "community_events_list",
      category: "community_events",
      max: getCategoryDisplayLimit("community_events")
    }
  ];

  const listResults = await Promise.all(
    listConfigs.map(async ({ key, category, max }) => ({
      key,
      value: await buildCategoryListWithDetails(
        category,
        grouped[category] ?? [],
        max
      )
    }))
  );

  const listMap = Object.fromEntries(
    listResults.map(({ key, value }) => [key, value])
  ) as Partial<CommunityData>;

  // Build neighborhood lists from consolidated queries
  // neighborhoods_general covers general + relocators
  // neighborhoods_family covers family + luxury
  // neighborhoods_senior covers senior-specific
  const neighborhoodsGeneral = buildNeighborhoodDetailList(
    grouped.neighborhoods_general ?? []
  );
  const neighborhoodsFamily = buildNeighborhoodDetailList(
    grouped.neighborhoods_family ?? []
  );
  const neighborhoodsSenior = buildNeighborhoodDetailList(
    grouped.neighborhoods_senior ?? []
  );
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
    dining_list: listMap.dining_list ?? "- (none found)",
    coffee_brunch_list: listMap.coffee_brunch_list ?? "- (none found)",
    nature_outdoors_list: listMap.nature_outdoors_list ?? "- (none found)",
    shopping_list: listMap.shopping_list ?? "- (none found)",
    entertainment_list: listMap.entertainment_list ?? "- (none found)",
    arts_culture_list: listMap.arts_culture_list ?? "- (none found)",
    attractions_list: listMap.attractions_list ?? "- (none found)",
    sports_rec_list: listMap.sports_rec_list ?? "- (none found)",
    nightlife_social_list: listMap.nightlife_social_list ?? "- (none found)",
    fitness_wellness_list: listMap.fitness_wellness_list ?? "- (none found)",
    education_list: listMap.education_list ?? "- (none found)",
    community_events_list:
      listMap.community_events_list ?? "- (none found)",
  };

  await setCachedCommunityData(
    zipCode,
    baseCommunityData,
    preferredCity,
    preferredState
  );
  return baseCommunityData;
}

export async function getCommunityDataByZipAndAudience(
  zipCode: string,
  audienceSegment?: string,
  serviceAreas?: string[] | null,
  preferredCity?: string | null,
  preferredState?: string | null
): Promise<CommunityData | null> {
  const base = await getCommunityDataByZip(
    zipCode,
    serviceAreas,
    preferredCity,
    preferredState
  );
  if (!base) {
    return null;
  }

  const normalized = normalizeAudienceSegment(audienceSegment);
  if (!normalized) {
    return base;
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

  const merged = delta ? applyAudienceDelta(base, delta) : base;
  return buildAudienceCommunityData(
    trimCommunityDataLists(merged),
    normalized
  );
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
    return cached;
  }

  const description = await fetchCityDescription(city, state);
  if (description) {
    await setCachedCityDescription(city, state, description);
  }

  return description;
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
