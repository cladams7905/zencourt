import type { CommunityData } from "@web/src/lib/domain/market/types";
import type { AudienceDelta } from "../cache";
import { countListItems, trimList } from "./places";
import { CATEGORY_FIELD_MAP } from "./seasonal";
import {
  AUDIENCE_AUGMENT_CATEGORIES,
  getCategoryDisplayLimit,
  getCategoryMinPrimaryResults,
  type AudienceAugmentCategory,
  type CategoryKey
} from "@web/src/server/services/_config/community";

export function applyAudienceDelta(
  communityData: CommunityData,
  delta: AudienceDelta
): CommunityData {
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

  const mergeLists = (
    deltaList: string,
    baseList: string,
    max: number
  ): string => {
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
    const field = CATEGORY_FIELD_MAP[category];
    const deltaList = delta[category];
    if (!deltaList || !field) {
      continue;
    }
    if (deltaList.includes("(none found)")) {
      continue;
    }
    const max = getCategoryDisplayLimit(category);
    const baseList = communityData[field];
    if (typeof baseList !== "string") {
      continue;
    }
    updated = {
      ...updated,
      [field]: mergeLists(deltaList, baseList, max)
    };
  }

  return updated;
}

export function trimCommunityDataLists(
  communityData: CommunityData
): CommunityData {
  return {
    ...communityData,
    seasonal_geo_sections: communityData.seasonal_geo_sections ?? {},
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

export function getAudienceSkipCategories(
  delta: AudienceDelta | null
): Set<CategoryKey> {
  const skip = new Set<CategoryKey>();
  if (!delta) {
    return skip;
  }

  for (const category of AUDIENCE_AUGMENT_CATEGORIES) {
    const list = delta[category];
    if (!list || list.includes("(none found)")) {
      continue;
    }
    const count = countListItems(list);
    const minPrimary = getCategoryMinPrimaryResults(category);
    if (minPrimary <= 0 || count >= minPrimary) {
      skip.add(category);
    }
  }

  return skip;
}
