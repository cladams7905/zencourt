import type { CommunityData } from "@web/src/types/market";
import type { CityRecord } from "./geo";
import {
  CATEGORY_CONFIG,
  getCategoryDisplayLimit,
  type CategoryKey
} from "@web/src/server/services/community/config";
import {
  buildSeasonalQueries,
  CATEGORY_FIELD_MAP,
  NON_NEIGHBORHOOD_CATEGORY_KEYS
} from "./seasonal";

const NONE_FOUND = "- (none found)";

type LoggerLike = {
  info: (context: unknown, message?: string) => void;
};

export type CategoryQueryPlanItem = {
  key: string;
  queries: string[];
  seasonalQueries: Set<string>;
  max: number;
};

export function buildCategoryQueryPlan(params: {
  location: CityRecord;
  zipCode: string;
  categoriesToFetch: Set<CategoryKey>;
  allowedSeasonalCategories: Set<CategoryKey>;
  usedSeasonalHeaders: Set<string>;
  logger: LoggerLike;
}): CategoryQueryPlanItem[] {
  const {
    location,
    zipCode,
    categoriesToFetch,
    allowedSeasonalCategories,
    usedSeasonalHeaders,
    logger
  } = params;

  return Object.entries(CATEGORY_CONFIG)
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
}

export function buildBaseCategoryFieldValues(params: {
  skipCategories: Set<CategoryKey>;
  listMap: Map<keyof CommunityData, string>;
}): Partial<CommunityData> {
  const { skipCategories, listMap } = params;
  const values: Partial<CommunityData> = {};

  for (const category of NON_NEIGHBORHOOD_CATEGORY_KEYS) {
    const field = CATEGORY_FIELD_MAP[category];
    values[field] = skipCategories.has(category)
      ? NONE_FOUND
      : (listMap.get(field) ?? NONE_FOUND);
  }

  return values;
}

export function getBaseDetailCallsForCategories(
  categoriesToFetch: Set<CategoryKey>
): number {
  return NON_NEIGHBORHOOD_CATEGORY_KEYS
    .filter((category) => categoriesToFetch.has(category))
    .reduce((sum, category) => sum + getCategoryDisplayLimit(category), 0);
}
