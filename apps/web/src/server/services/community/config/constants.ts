import type { AudienceSegment, CategoryKey } from "./types";

export const COMMUNITY_CACHE_KEY_PREFIX = "community";
export const DEFAULT_SEARCH_RADIUS_METERS = 15000;
export const MAX_PLACE_DISTANCE_KM = 20;
export const DISTANCE_SCORE_WEIGHT = 0.12;
export const DISTANCE_SCORE_CAP_KM = 15;

export const SEARCH_ANCHOR_OFFSETS = [{ lat: 0, lng: 0 }];

export const CHAIN_NAME_BLACKLIST = [
  "mcdonald",
  "burger king",
  "wendy",
  "taco bell",
  "kfc",
  "subway",
  "domino",
  "pizza hut",
  "papa john",
  "chipotle",
  "starbucks",
  "dunkin",
  "panera",
  "olive garden",
  "applebee",
  "chili",
  "red lobster",
  "outback",
  "ihop",
  "denny",
  "cracker barrel",
  "buffalo wild wings"
];

export const CHAIN_FILTER_CATEGORIES: CategoryKey[] = [
  "dining",
  "coffee_brunch",
  "nightlife_social",
  "shopping",
  "fitness_wellness",
  "entertainment",
  "sports_rec"
];

export const SERVICE_AREA_CACHE_CATEGORIES: CategoryKey[] = [
  "dining",
  "coffee_brunch",
  "nightlife_social"
];

const SERVICE_AREA_CACHE_CATEGORY_SET = new Set(SERVICE_AREA_CACHE_CATEGORIES);

export function shouldIncludeServiceAreasInCache(category: CategoryKey): boolean {
  return SERVICE_AREA_CACHE_CATEGORY_SET.has(category);
}

export const PACIFIC_NORTHWEST_STATES = new Set(["WA", "OR"]);
export const MOUNTAIN_STATES = new Set(["CO", "UT", "ID", "MT", "WY"]);
export const DESERT_SOUTHWEST_STATES = new Set(["AZ", "TX", "NM", "NV"]);
export const GULF_COAST_STATES = new Set(["LA", "MS", "AL"]);
export const ATLANTIC_SOUTH_STATES = new Set(["FL", "GA", "SC", "NC"]);
export const MID_ATLANTIC_STATES = new Set(["VA", "MD", "DE", "NJ"]);
export const NEW_ENGLAND_STATES = new Set(["NY", "CT", "RI", "MA", "NH", "ME"]);
export const GREAT_LAKES_STATES = new Set(["MN", "WI", "IL", "IN", "MI", "OH", "PA"]);
export const CALIFORNIA_STATES = new Set(["CA"]);
export const HAWAII_STATES = new Set(["HI"]);
export const ALASKA_STATES = new Set(["AK"]);

export const AUDIENCE_SEGMENT_ALIASES: Record<string, AudienceSegment> = {
  first_time_homebuyers: "first_time_homebuyers",
  first_time_buyers: "first_time_homebuyers",
  growing_families: "growing_families",
  downsizers_retirees: "downsizers_retirees",
  luxury_homebuyers: "luxury_homebuyers",
  real_estate_investors: "investors_relocators",
  job_transferees: "investors_relocators",
  vacation_property_buyers: "investors_relocators",
  military_veterans: "investors_relocators",
  relocators: "investors_relocators"
};

export const NORMALIZED_AUDIENCE_SEGMENTS = new Set<AudienceSegment>([
  "first_time_homebuyers",
  "growing_families",
  "downsizers_retirees",
  "luxury_homebuyers",
  "investors_relocators"
]);

export const NEIGHBORHOOD_REJECT_TERMS = [
  "services",
  "division",
  "department",
  "office",
  "authority",
  "program",
  "government",
  "city of",
  "county",
  "market",
  "center",
  "public works"
];

export const NEIGHBORHOOD_QUERIES = [
  {
    key: "neighborhoods_general",
    query: "neighborhood subdivision residential community",
    max: 12
  },
  {
    key: "neighborhoods_family",
    query: "family neighborhood gated community luxury subdivision",
    max: 12
  },
  {
    key: "neighborhoods_senior",
    query: "55+ community retirement senior living",
    max: 8
  }
];
