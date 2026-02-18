import type { CategoryConfig, CategoryKey } from "./types";

export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  neighborhoods: {
    displayLimit: 5,
    poolMax: 0,
    minRating: 0,
    minReviews: 0,
    targetQueryCount: 1,
    fallbackQueries: [],
    maxPerQuery: 8,
    minPrimaryResults: 0
  },
  dining: {
    displayLimit: 8,
    poolMax: 50,
    minRating: 4.5,
    minReviews: 100,
    targetQueryCount: 2,
    fallbackQueries: ["best local restaurants"],
    maxPerQuery: 20,
    minPrimaryResults: 3
  },
  coffee_brunch: {
    displayLimit: 5,
    poolMax: 30,
    minRating: 4.4,
    minReviews: 40,
    targetQueryCount: 2,
    fallbackQueries: ["coffee shop cafe"],
    maxPerQuery: 12,
    minPrimaryResults: 2
  },
  nature_outdoors: {
    displayLimit: 4,
    poolMax: 20,
    minRating: 4.5,
    minReviews: 20,
    targetQueryCount: 2,
    fallbackQueries: ["park trail hiking"],
    maxPerQuery: 12,
    minPrimaryResults: 2
  },
  entertainment: {
    displayLimit: 4,
    poolMax: 18,
    minRating: 4.0,
    minReviews: 10,
    targetQueryCount: 1,
    fallbackQueries: ["live music theater entertainment venue"],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  attractions: {
    displayLimit: 4,
    poolMax: 10,
    minRating: 4.0,
    minReviews: 10,
    targetQueryCount: 1,
    fallbackQueries: ["local attraction historic landmark tourist site"],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  sports_rec: {
    displayLimit: 4,
    poolMax: 14,
    minRating: 4.0,
    minReviews: 10,
    targetQueryCount: 1,
    fallbackQueries: ["sports recreation center"],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  arts_culture: {
    displayLimit: 4,
    poolMax: 14,
    minRating: 4.0,
    minReviews: 8,
    targetQueryCount: 1,
    fallbackQueries: ["art gallery museum cultural center"],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  nightlife_social: {
    displayLimit: 5,
    poolMax: 30,
    minRating: 4.0,
    minReviews: 12,
    targetQueryCount: 1,
    fallbackQueries: ["brewery winery bar lounge"],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  fitness_wellness: {
    displayLimit: 4,
    poolMax: 16,
    minRating: 4.0,
    minReviews: 10,
    targetQueryCount: 1,
    fallbackQueries: ["gym fitness yoga wellness"],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  shopping: {
    displayLimit: 4,
    poolMax: 16,
    minRating: 4.0,
    minReviews: 10,
    targetQueryCount: 1,
    fallbackQueries: ["local shop boutique"],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  education: {
    displayLimit: 3,
    poolMax: 8,
    minRating: 3.8,
    minReviews: 200,
    targetQueryCount: 1,
    fallbackQueries: ["university campus"],
    maxPerQuery: 15,
    minPrimaryResults: 0
  },
  community_events: {
    displayLimit: 3,
    poolMax: 10,
    minRating: 3.8,
    minReviews: 5,
    targetQueryCount: 1,
    fallbackQueries: ["farmers market festival fair"],
    maxPerQuery: 10,
    minPrimaryResults: 1
  }
};

export function getCategoryConfig(category: string): CategoryConfig | undefined {
  return CATEGORY_CONFIG[category as CategoryKey];
}

export function getCategoryDisplayLimit(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.displayLimit ?? 5;
}

export function getCategoryPoolMax(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.poolMax ?? 30;
}

export function getCategoryMinRating(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.minRating ?? 0;
}

export function getCategoryMinReviews(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.minReviews ?? 0;
}

export function getCategoryFallbackQueries(category: string): string[] {
  return CATEGORY_CONFIG[category as CategoryKey]?.fallbackQueries ?? [];
}

export function getCategoryMinPrimaryResults(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.minPrimaryResults ?? 2;
}

export function getCategoryTargetQueryCount(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.targetQueryCount ?? 1;
}
