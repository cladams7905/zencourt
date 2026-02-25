import type { CommunityData } from "@web/src/lib/domain/market/types";
import type {
  CategoryKey,
  CommunityCategoryPayload
} from "@web/src/server/services/_config/community";
import { formatPerplexityCategoryList } from "./formatting";

const NONE_FOUND = "- (none found)";

export function buildCategoryList(
  category: CategoryKey,
  payload: CommunityCategoryPayload | null,
  audienceLabel?: string
): string {
  if (!payload || !payload.items || payload.items.length === 0) {
    return NONE_FOUND;
  }
  return formatPerplexityCategoryList(category, payload.items, audienceLabel);
}

export function buildPerplexityCommunityData(params: {
  zipCode: string;
  location: { city: string; state: string };
  listMap: Map<CategoryKey, string>;
  seasonalSections?: Record<string, string>;
}): CommunityData {
  const neighborhoods = params.listMap.get("neighborhoods") ?? NONE_FOUND;
  return {
    city: params.location.city,
    state: params.location.state,
    zip_code: params.zipCode,
    data_timestamp: new Date().toISOString(),
    neighborhoods_list: neighborhoods,
    neighborhoods_family_list: neighborhoods,
    neighborhoods_luxury_list: neighborhoods,
    neighborhoods_senior_list: neighborhoods,
    neighborhoods_relocators_list: neighborhoods,
    dining_list: params.listMap.get("dining") ?? NONE_FOUND,
    coffee_brunch_list: params.listMap.get("coffee_brunch") ?? NONE_FOUND,
    nature_outdoors_list: params.listMap.get("nature_outdoors") ?? NONE_FOUND,
    shopping_list: params.listMap.get("shopping") ?? NONE_FOUND,
    entertainment_list: params.listMap.get("entertainment") ?? NONE_FOUND,
    arts_culture_list: params.listMap.get("arts_culture") ?? NONE_FOUND,
    attractions_list: params.listMap.get("attractions") ?? NONE_FOUND,
    sports_rec_list: params.listMap.get("sports_rec") ?? NONE_FOUND,
    nightlife_social_list: params.listMap.get("nightlife_social") ?? NONE_FOUND,
    fitness_wellness_list: params.listMap.get("fitness_wellness") ?? NONE_FOUND,
    education_list: params.listMap.get("education") ?? NONE_FOUND,
    community_events_list: params.listMap.get("community_events") ?? NONE_FOUND,
    seasonal_geo_sections: params.seasonalSections ?? {}
  };
}
