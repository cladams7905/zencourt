import {
  DISTANCE_SCORE_CAP_KM,
  DISTANCE_SCORE_WEIGHT,
  getCategoryDisplayLimit
} from "@web/src/server/services/community/config";

export type ScoredPlace = {
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

function shuffleArray<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function sampleRandom<T>(arr: T[], count: number): T[] {
  if (arr.length <= count) {
    return [...arr];
  }
  const shuffled = shuffleArray([...arr]);
  return shuffled.slice(0, count);
}

/**
 * Weighted random sampling from a pool of places.
 * Biases toward higher-quality places while still providing variety.
 */
export function sampleFromPool<T>(pool: T[], count: number): T[] {
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

export function rankPlaces(places: ScoredPlace[]): ScoredPlace[] {
  return [...places].sort((a, b) => {
    const distanceA =
      a.distanceKm !== undefined
        ? Math.min(a.distanceKm, DISTANCE_SCORE_CAP_KM) * DISTANCE_SCORE_WEIGHT
        : 0;
    const distanceB =
      b.distanceKm !== undefined
        ? Math.min(b.distanceKm, DISTANCE_SCORE_CAP_KM) * DISTANCE_SCORE_WEIGHT
        : 0;
    const scoreA = Math.log10(a.reviewCount + 1) * 10 + (a.rating || 0) - distanceA;
    const scoreB = Math.log10(b.reviewCount + 1) * 10 + (b.rating || 0) - distanceB;
    return scoreB - scoreA;
  });
}

export function dedupePlaces(places: ScoredPlace[]): ScoredPlace[] {
  const seen = new Map<string, ScoredPlace>();

  for (const place of places) {
    const key = place.placeId
      ? `place:${place.placeId}`
      : `${place.name}|${place.address}`.toLowerCase().replace(/[^a-z0-9|]+/g, "");

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
      const merged = new Set([...(existing.sourceQueries ?? []), ...place.sourceQueries]);
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

export function formatPlaceList(
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

export function buildNeighborhoodDetailList(items: ScoredPlace[]): string {
  if (items.length === 0) {
    return "- (none found)";
  }

  const lines = rankPlaces(dedupePlaces(items))
    .slice(0, getCategoryDisplayLimit("neighborhoods"))
    .map((place) => `- ${place.name}`);

  return lines.length > 0 ? lines.join("\n") : "- (none found)";
}

export function trimList(list: string, max: number, stripKeywords: boolean): string {
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

  return trimmed.map((line) => line.replace(/\s+—\s+[^—]+$/g, "")).join("\n");
}

export function countListItems(list: string | undefined): number {
  if (!list) {
    return 0;
  }

  return list
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.includes("(none found)")).length;
}
