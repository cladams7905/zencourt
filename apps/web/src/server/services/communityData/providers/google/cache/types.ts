import type { AudienceAugmentCategory } from "@web/src/server/services/communityData/config";

export type AudienceDelta = Partial<Record<AudienceAugmentCategory, string>>;

export type CachedPlacePoolItem = {
  placeId: string;
  sourceQueries: string[] | undefined;
};

export type CachedPlacePool = {
  items?: CachedPlacePoolItem[];
  placeIds?: string[];
  fetchedAt: string;
  queryCount: number;
};

export type CityDescriptionCachePayload = {
  description: string;
  citations?: Array<{ title?: string; url?: string; source?: string }> | null;
};
