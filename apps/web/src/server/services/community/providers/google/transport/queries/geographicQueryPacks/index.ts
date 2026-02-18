import { NATURE_OUTDOORS_GEO_SEASON_QUERIES } from "./categories/nature_outdoors";
import { SPORTS_REC_GEO_SEASON_QUERIES } from "./categories/sports_rec";
import { ATTRACTIONS_GEO_SEASON_QUERIES } from "./categories/attractions";
import { COMMUNITY_EVENTS_GEO_SEASON_QUERIES } from "./categories/community_events";
import { DINING_GEO_SEASON_QUERIES } from "./categories/dining";
import { COFFEE_BRUNCH_GEO_SEASON_QUERIES } from "./categories/coffee_brunch";
import { NIGHTLIFE_SOCIAL_GEO_SEASON_QUERIES } from "./categories/nightlife_social";

export const GEO_SEASON_QUERY_PACK_BY_CATEGORY = {
  nature_outdoors: NATURE_OUTDOORS_GEO_SEASON_QUERIES,
  sports_rec: SPORTS_REC_GEO_SEASON_QUERIES,
  attractions: ATTRACTIONS_GEO_SEASON_QUERIES,
  community_events: COMMUNITY_EVENTS_GEO_SEASON_QUERIES,
  dining: DINING_GEO_SEASON_QUERIES,
  coffee_brunch: COFFEE_BRUNCH_GEO_SEASON_QUERIES,
  nightlife_social: NIGHTLIFE_SOCIAL_GEO_SEASON_QUERIES
} as const;
