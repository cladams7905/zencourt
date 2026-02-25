import type { CategoryKey } from "@web/src/server/services/_config/community";

export const AUDIENCE_ROTATION_PREFIX = "content:audience-rotation";
export const RECENT_HOOKS_TTL_SECONDS = 60 * 60 * 24 * 7;
export const RECENT_HOOKS_MAX = 50;

export const COMMUNITY_CATEGORY_KEYS = [
  "neighborhoods_list",
  "dining_list",
  "coffee_brunch_list",
  "nature_outdoors_list",
  "entertainment_list",
  "attractions_list",
  "sports_rec_list",
  "arts_culture_list",
  "nightlife_social_list",
  "fitness_wellness_list",
  "shopping_list",
  "education_list",
  "community_events_list"
];

export type CommunityCategoryKey = string;

export const COMMUNITY_CATEGORY_KEY_TO_CATEGORY: Record<
  CommunityCategoryKey,
  CategoryKey
> = {
  neighborhoods_list: "neighborhoods",
  dining_list: "dining",
  coffee_brunch_list: "coffee_brunch",
  nature_outdoors_list: "nature_outdoors",
  entertainment_list: "entertainment",
  attractions_list: "attractions",
  sports_rec_list: "sports_rec",
  arts_culture_list: "arts_culture",
  nightlife_social_list: "nightlife_social",
  fitness_wellness_list: "fitness_wellness",
  shopping_list: "shopping",
  education_list: "education",
  community_events_list: "community_events"
};

export type CommunityCategoryCycleState = {
  remaining: CommunityCategoryKey[];
  cyclesCompleted: number;
};

export function shuffleArray<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function getCommunityCategoryCycleKey(userId: string): string {
  return `community_category_cycle:${userId}`;
}

export function getRecentHooksKey(userId: string, category: string): string {
  return `recent_hooks:${userId}:${category}`;
}
