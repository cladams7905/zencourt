import {
  CommunityDataProvider,
  type AudienceSegment,
  type CategoryKey,
  type CommunityCategoryPayload,
  type CommunityPlaceCitation,
  type CommunityPlaceItem
} from "@web/src/server/services/communityData/config";
import type {
  PerplexityCategoryResponse,
  PerplexityChatCompletionResponse,
  PerplexityPlaceDraft,
  PerplexitySearchResult
} from "../transport/types";
import { getWhySuitableFieldKey } from "../transport/helpers";
import { parsePossiblyWrappedJson } from "@web/src/server/utils/jsonParsing";
import {
  isRecord,
  normalizeOptionalString as normalizeString,
  normalizeOptionalNumber as normalizeNumber,
  normalizeOptionalStringArray as normalizeStringArray
} from "@web/src/server/utils/normalization";

function normalizeCitation(value: unknown): CommunityPlaceCitation | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const title = normalizeString(value.title);
  const url = normalizeString(value.url);
  const source = normalizeString(value.source);
  if (!title && !url) {
    return undefined;
  }
  return { title, url, source };
}

function normalizeCitations(
  value: unknown
): CommunityPlaceCitation[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const citations = value
    .map((entry) => normalizeCitation(entry))
    .filter((entry): entry is CommunityPlaceCitation => Boolean(entry));
  return citations.length > 0 ? citations : undefined;
}

function parsePlaceDraft(
  value: unknown,
  audience?: AudienceSegment
): PerplexityPlaceDraft | null {
  if (!isRecord(value)) {
    return null;
  }
  const name = normalizeString(value.name);
  if (!name) {
    return null;
  }
  const whyKey = getWhySuitableFieldKey(audience);
  return {
    name,
    location: normalizeString(value.location),
    drive_distance_minutes: normalizeNumber(value.drive_distance_minutes),
    dates: normalizeString(value.dates),
    description: normalizeString(value.description),
    cost: normalizeString(value.cost),
    why_suitable_for_audience:
      normalizeString(value[whyKey]) ??
      normalizeString(value.why_suitable_for_audience),
    cuisine: normalizeStringArray(value.cuisine),
    disclaimer: normalizeString(value.disclaimer),
    citations: normalizeCitations(value.citations)
  };
}

export function parsePerplexityCategoryJson(
  raw: unknown,
  audience?: AudienceSegment
): PerplexityCategoryResponse | null {
  const parsed = parsePossiblyWrappedJson(raw);

  if (!parsed) {
    return null;
  }

  const itemsCandidate = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.items)
      ? parsed.items
      : null;

  if (!itemsCandidate) {
    return null;
  }

  const items = itemsCandidate
    .map((entry) => parsePlaceDraft(entry, audience))
    .filter((entry): entry is PerplexityPlaceDraft => Boolean(entry));

  return { items };
}

function buildSearchResultCitations(
  searchResults?: PerplexitySearchResult[]
): CommunityPlaceCitation[] | undefined {
  if (!searchResults || searchResults.length === 0) {
    return undefined;
  }
  const citations = searchResults
    .map((result) => ({
      title: normalizeString(result.title),
      url: normalizeString(result.url),
      source: normalizeString(result.source)
    }))
    .filter((entry) => entry.title || entry.url);
  return citations.length > 0 ? citations : undefined;
}

function shouldIncludeCuisine(category: CategoryKey): boolean {
  return category === "dining" || category === "coffee_brunch";
}

function shouldIncludeDisclaimer(category: CategoryKey): boolean {
  return category === "nature_outdoors";
}

function buildPlaceItem(
  category: CategoryKey,
  draft: PerplexityPlaceDraft,
  fallbackCitations?: CommunityPlaceCitation[]
): CommunityPlaceItem {
  const citations =
    draft.citations && draft.citations.length > 0
      ? draft.citations
      : fallbackCitations;

  const cuisine = shouldIncludeCuisine(category) ? draft.cuisine : undefined;
  const disclaimer = shouldIncludeDisclaimer(category)
    ? draft.disclaimer
    : undefined;

  return {
    name: draft.name ?? "",
    location: draft.location,
    drive_distance_minutes:
      draft.drive_distance_minutes !== undefined
        ? Math.round(draft.drive_distance_minutes)
        : undefined,
    dates: draft.dates,
    description: draft.description,
    cost: draft.cost,
    why_suitable_for_audience: draft.why_suitable_for_audience,
    cuisine,
    disclaimer,
    citations
  };
}

export function buildCommunityCategoryPayload(params: {
  category: CategoryKey;
  audience?: AudienceSegment;
  zipCode: string;
  city?: string;
  state?: string;
  response: PerplexityChatCompletionResponse;
  maxItems?: number;
}): CommunityCategoryPayload | null {
  const content = params.response.choices?.[0]?.message?.content;
  if (!content) {
    return null;
  }

  const parsed = parsePerplexityCategoryJson(content, params.audience);
  if (!parsed) {
    return null;
  }

  const fallbackCitations = buildSearchResultCitations(
    params.response.search_results
  );
  const normalizedCity = params.city?.trim().toLowerCase() ?? "";
  const normalizedState = params.state?.trim().toLowerCase() ?? "";
  const items = parsed.items
    .map((item) => buildPlaceItem(params.category, item, fallbackCitations))
    .filter((item) => item.name)
    .filter((item) => {
      if (params.category !== "neighborhoods") {
        return true;
      }
      const name = item.name.trim().toLowerCase();
      if (!name) {
        return false;
      }
      if (normalizedCity && name === normalizedCity) {
        return false;
      }
      if (normalizedCity && normalizedState) {
        if (name === `${normalizedCity}, ${normalizedState}`) {
          return false;
        }
      }
      if (normalizedCity && name === `${normalizedCity} ${normalizedState}`) {
        return false;
      }
      return true;
    });

  return {
    provider: CommunityDataProvider.Perplexity,
    category: params.category,
    audience: params.audience,
    zip_code: params.zipCode,
    city: params.city,
    state: params.state,
    fetched_at: new Date().toISOString(),
    items: params.maxItems ? items.slice(0, params.maxItems) : items
  };
}
