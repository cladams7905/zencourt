import type { CategoryKey } from "@web/src/server/services/community/config";
import { GEO_SEASON_QUERY_PACK_BY_CATEGORY } from "./geographicQueryPacks";

export const GEO_SEASON_QUERY_PACK: Partial<
  Record<
    CategoryKey,
    Record<string, Record<string, string[]>>
  >
> = GEO_SEASON_QUERY_PACK_BY_CATEGORY;
