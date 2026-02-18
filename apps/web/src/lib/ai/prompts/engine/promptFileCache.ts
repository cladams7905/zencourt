import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ListingContentSubcategory } from "@shared/types/models";

const DEFAULT_PROMPTS_ROOT = path.join(
  process.cwd(),
  "src/lib/ai/prompts/content"
);
const FALLBACK_PROMPTS_ROOT = path.join(
  process.cwd(),
  "apps/web/src/lib/ai/prompts/content"
);
export const PROMPTS_ROOT = existsSync(DEFAULT_PROMPTS_ROOT)
  ? DEFAULT_PROMPTS_ROOT
  : FALLBACK_PROMPTS_ROOT;

const promptCache = new Map<string, string>();

export async function readPromptFile(relativePath: string): Promise<string> {
  if (promptCache.has(relativePath)) {
    return promptCache.get(relativePath)!;
  }

  const fullPath = path.join(PROMPTS_ROOT, relativePath);
  const content = await readFile(fullPath, "utf8");
  promptCache.set(relativePath, content);
  return content;
}

export function clearPromptCache(): void {
  promptCache.clear();
}

export const AUDIENCE_FILES: Record<string, string> = {
  first_time_homebuyers: "audience/first-time-homebuyers.md",
  first_time_buyers: "audience/first-time-homebuyers.md",
  growing_families: "audience/growing-families.md",
  downsizers_retirees: "audience/downsizers-retirees.md",
  vacation_property_buyers: "audience/vacation-property-buyers.md",
  military_veterans: "audience/military-veterans.md",
  real_estate_investors: "audience/real-estate-investors.md",
  luxury_homebuyers: "audience/luxury-homebuyers.md",
  relocators: "audience/relocators.md",
  job_transferees: "audience/relocators.md"
};

export const CATEGORY_HOOK_FILES: Record<string, string> = {
  educational: "hooks/educational-hooks.md",
  market_insights: "hooks/market-insights-hooks.md",
  community: "hooks/community-hooks.md",
  listing: "hooks/listing-hooks.md",
  lifestyle: "hooks/lifestyle-hooks.md",
  seasonal: "hooks/seasonal_hooks.md"
};

export const LISTING_SUBCATEGORY_DIRECTIVE_FILES: Record<
  ListingContentSubcategory,
  string
> = {
  new_listing: "listingSubcategories/new-listing.md",
  open_house: "listingSubcategories/open-house.md",
  price_change: "listingSubcategories/price-change.md",
  status_update: "listingSubcategories/status-update.md",
  property_features: "listingSubcategories/property-features.md"
};

export const LISTING_SUBCATEGORY_HOOK_FILES: Record<
  ListingContentSubcategory,
  string
> = {
  new_listing: "hooks/listing-new-listing-hooks.md",
  open_house: "hooks/listing-open-house-hooks.md",
  price_change: "hooks/listing-price-change-hooks.md",
  status_update: "hooks/listing-status-update-hooks.md",
  property_features: "hooks/listing-property-features-hooks.md"
};
