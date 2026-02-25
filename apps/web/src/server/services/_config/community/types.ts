export type AudienceSegment =
  | "first_time_homebuyers"
  | "growing_families"
  | "downsizers_retirees"
  | "luxury_homebuyers"
  | "investors_relocators";

export type CategoryKey =
  | "neighborhoods"
  | "dining"
  | "coffee_brunch"
  | "nature_outdoors"
  | "entertainment"
  | "attractions"
  | "sports_rec"
  | "arts_culture"
  | "nightlife_social"
  | "fitness_wellness"
  | "shopping"
  | "education"
  | "community_events";

export type AudienceAugmentCategory = Exclude<CategoryKey, "neighborhoods">;

export type CategoryConfig = {
  displayLimit: number;
  poolMax: number;
  minRating: number;
  minReviews: number;
  targetQueryCount: number;
  fallbackQueries: string[];
  maxPerQuery: number;
  minPrimaryResults: number;
};

export type AudienceConfig = {
  augmentQueries: Partial<Record<AudienceAugmentCategory, string[]>>;
  augmentLimits: Partial<Record<AudienceAugmentCategory, number>>;
};

export enum CommunityDataProvider {
  Google = "google",
  Perplexity = "perplexity"
}

export type CommunityPlaceCitation = {
  title?: string;
  url?: string;
  source?: string;
};

export type CommunityPlaceItem = {
  name: string;
  location?: string;
  drive_distance_minutes?: number;
  dates?: string;
  description?: string;
  cost?: string;
  why_suitable_for_audience?: string;
  cuisine?: string[];
  disclaimer?: string;
  citations?: CommunityPlaceCitation[];
};

export type CommunityCategoryPayload = {
  provider: CommunityDataProvider.Perplexity;
  category: CategoryKey;
  audience?: AudienceSegment;
  zip_code: string;
  city?: string;
  state?: string;
  fetched_at: string;
  items: CommunityPlaceItem[];
};
