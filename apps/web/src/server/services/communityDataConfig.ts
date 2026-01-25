/**
 * Consolidated configuration for the community data service.
 * All configuration for categories, audiences, and API parameters in one place.
 */

// ============================================================================
// TYPES
// ============================================================================

export type AudienceSegment =
  | "young_professionals"
  | "growing_families"
  | "active_retirees"
  | "luxury_buyers"
  | "investors_relocators";

export type AudienceAugmentCategory = Exclude<CategoryKey, "neighborhoods">;

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

export type CategoryConfig = {
  displayLimit: number;
  poolMax: number;
  minRating: number;
  minReviews: number;
  targetQueryCount: number;
  /** Fallback queries - run only when audience queries return < minPrimaryResults */
  fallbackQueries: string[];
  maxPerQuery: number;
  /** Minimum results from audience queries before fallback kicks in */
  minPrimaryResults: number;
};

export type AudienceConfig = {
  augmentQueries: Partial<Record<AudienceAugmentCategory, string[]>>;
  augmentLimits: Partial<Record<AudienceAugmentCategory, number>>;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const COMMUNITY_CACHE_KEY_PREFIX = "community";
export const DEFAULT_SEARCH_RADIUS_METERS = 15000;
export const MAX_PLACE_DISTANCE_KM = 20;
export const DISTANCE_SCORE_WEIGHT = 0.12;
export const DISTANCE_SCORE_CAP_KM = 15;

export const SEARCH_ANCHOR_OFFSETS = [
  { lat: 0, lng: 0 }
];

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

// ============================================================================
// REGIONAL STATE CLASSIFICATIONS
// Each state should only appear in ONE primary geo classification to avoid
// conflicting queries.
// ============================================================================

/** Pacific Northwest - rainforests, mountains, rivers, coffee culture */
export const PACIFIC_NORTHWEST_STATES = new Set(["WA", "OR"]);

/** Rocky Mountain states - skiing, alpine, high elevation */
export const MOUNTAIN_STATES = new Set(["CO", "UT", "ID", "MT", "WY"]);

/** Desert/Southwest - Sonoran, Mojave, red rocks, arid climate */
export const DESERT_SOUTHWEST_STATES = new Set(["AZ", "TX", "NM", "NV"]);

/** Gulf Coast - fishing, bayous, Gulf beaches, Cajun culture */
export const GULF_COAST_STATES = new Set(["LA", "MS", "AL"]);

/** Atlantic South - warm beaches, barrier islands, Southern charm */
export const ATLANTIC_SOUTH_STATES = new Set(["FL", "GA", "SC", "NC"]);

/** Mid-Atlantic Coast - boardwalks, historic ports, bay areas */
export const MID_ATLANTIC_STATES = new Set(["VA", "MD", "DE", "NJ"]);

/** New England - rocky coast, lighthouses, lobster, fall foliage */
export const NEW_ENGLAND_STATES = new Set(["NY", "CT", "RI", "MA", "NH", "ME"]);

/** Great Lakes - lakefront, Midwest, freshwater beaches */
export const GREAT_LAKES_STATES = new Set(["MN", "WI", "IL", "IN", "MI", "OH", "PA"]);

/** California - diverse: beaches, mountains, desert, wine country */
export const CALIFORNIA_STATES = new Set(["CA"]);

/** Hawaii - tropical, volcanic, island culture */
export const HAWAII_STATES = new Set(["HI"]);

/** Alaska - wilderness, glaciers, wildlife, frontier */
export const ALASKA_STATES = new Set(["AK"]);

// ============================================================================
// AUDIENCE SEGMENT ALIASES
// ============================================================================

export const AUDIENCE_SEGMENT_ALIASES: Record<string, AudienceSegment> = {
  first_time_homebuyers: "young_professionals",
  growing_families: "growing_families",
  downsizers_retirees: "active_retirees",
  luxury_homebuyers: "luxury_buyers",
  real_estate_investors: "investors_relocators",
  job_transferees: "investors_relocators",
  vacation_property_buyers: "investors_relocators",
  military_veterans: "investors_relocators",
  relocators: "investors_relocators"
};

export const NORMALIZED_AUDIENCE_SEGMENTS = new Set<AudienceSegment>([
  "young_professionals",
  "growing_families",
  "active_retirees",
  "luxury_buyers",
  "investors_relocators"
]);

// ============================================================================
// NEIGHBORHOOD CONFIG
// ============================================================================

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

// ============================================================================
// CATEGORY CONFIGURATION
// ============================================================================

/**
 * Category configuration with fallback queries.
 *
 * QUERY FLOW:
 * 1. Audience-specific queries run first (from AUDIENCE_CONFIG.augmentQueries)
 * 2. Geo/Season packs are applied to audience queries
 * 3. If results < minPrimaryResults, fallbackQueries run to fill gaps
 *
 * This ensures localized, audience-relevant data is prioritized,
 * with generic fallbacks only when needed.
 */
export const CATEGORY_CONFIG: Record<CategoryKey, CategoryConfig> = {
  neighborhoods: {
    displayLimit: 5,
    poolMax: 0,
    minRating: 0,
    minReviews: 0,
    targetQueryCount: 1,
    fallbackQueries: [], // Neighborhoods use separate NEIGHBORHOOD_QUERIES
    maxPerQuery: 8,
    minPrimaryResults: 0
  },
  dining: {
    displayLimit: 5,
    poolMax: 40,
    minRating: 4.5,
    minReviews: 100,
    targetQueryCount: 2,
    // Generic fallback - only used if audience queries return sparse results
    fallbackQueries: [
      "best local restaurants"
    ],
    maxPerQuery: 15,
    minPrimaryResults: 3
  },
  coffee_brunch: {
    displayLimit: 5,
    poolMax: 30,
    minRating: 4.4,
    minReviews: 40,
    targetQueryCount: 2,
    fallbackQueries: [
      "coffee shop cafe"
    ],
    maxPerQuery: 12,
    minPrimaryResults: 2
  },
  nature_outdoors: {
    displayLimit: 4,
    poolMax: 20,
    minRating: 4.5,
    minReviews: 20,
    targetQueryCount: 2,
    fallbackQueries: [
      "park trail hiking"
    ],
    maxPerQuery: 12,
    minPrimaryResults: 2
  },
  entertainment: {
    displayLimit: 4,
    poolMax: 18,
    minRating: 4.0,
    minReviews: 10,
    targetQueryCount: 1,
    fallbackQueries: [
      "live music theater entertainment venue"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  attractions: {
    displayLimit: 4,
    poolMax: 10,
    minRating: 4.0,
    minReviews: 10,
    targetQueryCount: 1,
    fallbackQueries: [
      "local attraction historic landmark tourist site"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  sports_rec: {
    displayLimit: 4,
    poolMax: 14,
    minRating: 4.0,
    minReviews: 10,
    targetQueryCount: 1,
    fallbackQueries: [
      "sports recreation center"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  arts_culture: {
    displayLimit: 4,
    poolMax: 14,
    minRating: 4.0,
    minReviews: 8,
    targetQueryCount: 1,
    fallbackQueries: [
      "art gallery museum cultural center"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  nightlife_social: {
    displayLimit: 5,
    poolMax: 30,
    minRating: 4.0,
    minReviews: 12,
    targetQueryCount: 1,
    fallbackQueries: [
      "brewery winery bar lounge"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  fitness_wellness: {
    displayLimit: 4,
    poolMax: 16,
    minRating: 4.0,
    minReviews: 10,
    targetQueryCount: 1,
    fallbackQueries: [
      "gym fitness yoga wellness"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  shopping: {
    displayLimit: 4,
    poolMax: 16,
    minRating: 4.0,
    minReviews: 10,
    targetQueryCount: 1,
    fallbackQueries: [
      "local shop boutique"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  education: {
    displayLimit: 3,
    poolMax: 8,
    minRating: 3.8,
    minReviews: 200,
    targetQueryCount: 1,
    // Education is less audience-dependent, so fallback is primary
    fallbackQueries: [
      "university campus"
    ],
    maxPerQuery: 15,
    minPrimaryResults: 0 // Always use fallback for education
  },
  community_events: {
    displayLimit: 3,
    poolMax: 10,
    minRating: 3.8,
    minReviews: 5,
    targetQueryCount: 1,
    fallbackQueries: [
      "farmers market festival fair"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 1
  }
};

// ============================================================================
// AUDIENCE CONFIGURATION
// ============================================================================

const DEFAULT_AUGMENT_LIMITS: Partial<Record<AudienceAugmentCategory, number>> = {
  entertainment: 6,
  sports_rec: 6,
  nature_outdoors: 6,
  dining: 8,
  fitness_wellness: 6,
  shopping: 6,
  coffee_brunch: 6,
  nightlife_social: 6,
  arts_culture: 6,
  attractions: 6,
  education: 6,
  community_events: 6
};

/**
 * Audience configuration with PRIMARY queries for each segment.
 *
 * IMPORTANT: These queries are the PRIMARY source - they run FIRST.
 * Fallback queries from CATEGORY_CONFIG only run if these return sparse results.
 *
 * Each audience has:
 * - augmentQueries: AUDIENCE-SPECIFIC queries (these are the PRIMARY queries)
 * - augmentLimits: Max results per category
 */
export const AUDIENCE_CONFIG: Record<AudienceSegment, AudienceConfig> = {
  young_professionals: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      // Trendy, urban-focused dining
      dining: [
        "trendy restaurant"
      ],
      nightlife_social: [
        "craft cocktail bar gastropub"
      ]
    }
  },
  growing_families: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      // Family-friendly, kid-focused
      dining: [
        "family restaurant kids menu"
      ],
      nature_outdoors: [
        "playground park picnic area"
      ]
    }
  },
  active_retirees: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      // Classic, refined, accessible
      dining: [
        "fine dining seafood steakhouse",
        "bistro classic restaurant"
      ],
      nature_outdoors: [
        "botanical garden arboretum"
      ]
    }
  },
  luxury_buyers: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      // Upscale, exclusive, premium
      dining: [
        "fine dining michelin tasting menu",
        "upscale steakhouse bistro"
      ],
      nature_outdoors: [
        "private garden estate grounds"
      ]
    }
  },
  investors_relocators: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      dining: [
        "local restaurant"
      ],
      coffee_brunch: [
        "coffee shop cafe"
      ]
    }
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get category configuration with defaults.
 */
export function getCategoryConfig(category: string): CategoryConfig | undefined {
  return CATEGORY_CONFIG[category as CategoryKey];
}

/**
 * Get audience configuration with defaults.
 */
export function getAudienceConfig(audience: string): AudienceConfig | undefined {
  return AUDIENCE_CONFIG[audience as AudienceSegment];
}

/**
 * Get augment categories for audience-based fetching.
 */
export const AUDIENCE_AUGMENT_CATEGORIES: AudienceAugmentCategory[] = [
  "dining",
  "coffee_brunch",
  "nightlife_social",
  "nature_outdoors"
];

// ============================================================================
// BACKWARD-COMPATIBLE ACCESSORS
// These provide the same interface as the old separate config objects
// ============================================================================

/**
 * Get display limit for a category.
 */
export function getCategoryDisplayLimit(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.displayLimit ?? 5;
}

/**
 * Get pool max size for a category.
 */
export function getCategoryPoolMax(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.poolMax ?? 30;
}

/**
 * Get minimum rating threshold for a category.
 */
export function getCategoryMinRating(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.minRating ?? 0;
}

/**
 * Get minimum review count for a category.
 */
export function getCategoryMinReviews(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.minReviews ?? 0;
}

/**
 * Get audience augment queries for a specific audience and category.
 */
export function getAudienceAugmentQueries(
  audience: string,
  category: AudienceAugmentCategory
): string[] {
  return AUDIENCE_CONFIG[audience as AudienceSegment]?.augmentQueries?.[category] ?? [];
}

/**
 * Get all augment queries for an audience segment.
 */
export function getAllAudienceAugmentQueries(
  audience: string
): Partial<Record<AudienceAugmentCategory, string[]>> | undefined {
  return AUDIENCE_CONFIG[audience as AudienceSegment]?.augmentQueries;
}

/**
 * Get audience augment limit for a category.
 */
export function getAudienceAugmentLimit(
  audience: string,
  category: AudienceAugmentCategory
): number {
  return (
    AUDIENCE_CONFIG[audience as AudienceSegment]?.augmentLimits?.[category] ??
    DEFAULT_AUGMENT_LIMITS[category] ??
    6
  );
}

/**
 * Get audience category map (detailed and basic categories).
 */
/**
 * Get fallback queries for a category.
 * These run only when audience-specific queries return sparse results.
 */
export function getCategoryFallbackQueries(category: string): string[] {
  return CATEGORY_CONFIG[category as CategoryKey]?.fallbackQueries ?? [];
}

/**
 * Get minimum primary results threshold before fallback kicks in.
 */
export function getCategoryMinPrimaryResults(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.minPrimaryResults ?? 2;
}

/**
 * Get target query count for a category (audience + fallback combined).
 */
export function getCategoryTargetQueryCount(category: string): number {
  return CATEGORY_CONFIG[category as CategoryKey]?.targetQueryCount ?? 1;
}
