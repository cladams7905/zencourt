import type { CachedPlacePoolItem, CommunityCache } from "../cache";
import type { ScoredPlace } from "./places";
import { dedupePlaces, rankPlaces, sampleFromPool } from "./places";
import {
  getCategoryDisplayLimit,
  getCategoryPoolMax
} from "@web/src/server/services/_config/community";

type LoggerLike = {
  warn: (context: unknown, message?: string) => void;
};

type PoolContext = {
  zipCode: string;
  category: string;
  audience?: string | null;
  serviceAreas?: string[] | null;
  city?: string | null;
  state?: string | null;
};

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

export async function getPooledCategoryPlaces(
  cache: CommunityCache,
  logger: LoggerLike,
  context: PoolContext,
  fetchPlacesFn: () => Promise<ScoredPlace[]>
): Promise<CachedPlacePoolItem[]> {
  const { zipCode, category, audience, serviceAreas, city, state } = context;

  const refreshPool = async () => {
    try {
      const freshPlaces = await fetchPlacesFn();
      const items = buildPoolItems(freshPlaces, category);
      if (items.length > 0) {
        await cache.setCachedPlacePool(
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

  const cachedPool = await cache.getCachedPlacePool(
    zipCode,
    category,
    audience,
    serviceAreas,
    city,
    state
  );

  let pool: CachedPlacePoolItem[];

  const cachedItems =
    cachedPool?.items && cachedPool.items.length > 0
      ? cachedPool.items
      : cachedPool?.placeIds && cachedPool.placeIds.length > 0
        ? cachedPool.placeIds.map((placeId) => ({
            placeId,
            sourceQueries: undefined
          }))
        : [];

  if (
    cachedItems.length > 0 &&
    cachedPool &&
    !cache.isPoolStale(cachedPool.fetchedAt)
  ) {
    pool = cachedItems;
  } else if (cachedItems.length > 0 && cachedPool) {
    pool = cachedItems;
    void refreshPool();
  } else {
    const freshPlaces = await fetchPlacesFn();
    const items = buildPoolItems(freshPlaces, category);
    if (items.length > 0) {
      await cache.setCachedPlacePool(
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

  const displayLimit = getCategoryDisplayLimit(category);
  return sampleFromPool(pool, displayLimit);
}
