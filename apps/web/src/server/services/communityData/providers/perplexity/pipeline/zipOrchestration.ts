import type { CommunityData } from "@web/src/lib/domain/market/types";
import type { CategoryKey } from "@web/src/server/services/_config/community";
import { normalizeAudienceSegment } from "../../../shared/audience";
import {
  getPerplexityCommunityDataForCategories,
  getPerplexityMonthlyEventsSection,
  prefetchPerplexityCategories
} from "./service";
import { resolveLocationOrWarn, toOriginLocationInput } from "../../google";

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

  const normalized = normalizeAudienceSegment(audienceSegment);
  const location = await resolveLocationOrWarn(
    zipCode,
    preferredCity,
    preferredState,
    normalized ? { audience: normalized } : undefined
  );
  if (!location) {
    return null;
  }

  return getPerplexityCommunityDataForCategories({
    zipCode,
    location: toOriginLocationInput(location),
    audience: normalized,
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

  const normalized = normalizeAudienceSegment(audienceSegment);
  const location = await resolveLocationOrWarn(
    zipCode,
    preferredCity,
    preferredState,
    normalized ? { audience: normalized } : undefined
  );
  if (!location) {
    return null;
  }

  return getPerplexityMonthlyEventsSection({
    zipCode,
    location: toOriginLocationInput(location),
    audience: normalized
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

  const normalized = normalizeAudienceSegment(audienceSegment);
  const location = await resolveLocationOrWarn(
    zipCode,
    preferredCity,
    preferredState,
    normalized ? { audience: normalized } : undefined
  );
  if (!location) {
    return;
  }

  await prefetchPerplexityCategories({
    zipCode,
    location: toOriginLocationInput(location),
    audience: normalized,
    serviceAreas,
    categories
  });
}
