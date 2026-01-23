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

export type AudienceAugmentCategory =
  | "entertainment"
  | "sports_rec"
  | "nature_outdoors"
  | "dining"
  | "fitness_wellness"
  | "shopping";

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
  /** Fallback queries - run only when audience queries return < minPrimaryResults */
  fallbackQueries: string[];
  maxPerQuery: number;
  /** Minimum results from audience queries before fallback kicks in */
  minPrimaryResults: number;
};

export type AudienceConfig = {
  augmentQueries: Record<AudienceAugmentCategory, string[]>;
  augmentLimits: Record<AudienceAugmentCategory, number>;
};

// ============================================================================
// CONSTANTS
// ============================================================================

export const COMMUNITY_CACHE_KEY_PREFIX = "community";
export const DEFAULT_COMMUNITY_TTL_DAYS = 30;
export const DEFAULT_SEARCH_RADIUS_METERS = 15000;
export const MAX_PLACE_DISTANCE_KM = 40;
export const DISTANCE_SCORE_WEIGHT = 0.05;
export const DISTANCE_SCORE_CAP_KM = 20;

export const SEARCH_ANCHOR_OFFSETS = [
  { lat: 0, lng: 0 },
  { lat: 0.06, lng: 0.06 },
  { lat: -0.06, lng: -0.06 }
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
// conflicting queries. Exception: states can be in both a region AND warm/cold.
// ============================================================================

/** Pacific Northwest - rainforests, mountains, rivers, coffee culture */
export const PACIFIC_NORTHWEST_STATES = new Set(["WA", "OR"]);

/** Rocky Mountain states - skiing, alpine, high elevation */
export const MOUNTAIN_STATES = new Set(["CO", "UT", "ID", "MT", "WY"]);

/** Desert/Southwest - Sonoran, Mojave, red rocks, arid climate */
export const DESERT_SOUTHWEST_STATES = new Set(["AZ", "NM", "NV"]);

/** Gulf Coast - fishing, bayous, Gulf beaches, Cajun culture */
export const GULF_COAST_STATES = new Set(["TX", "LA", "MS", "AL"]);

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

// Legacy exports for backward compatibility (used in deriveGeoPackKeys)
export const COASTAL_STATES = new Set([
  ...GULF_COAST_STATES,
  ...ATLANTIC_SOUTH_STATES,
  ...MID_ATLANTIC_STATES,
  ...NEW_ENGLAND_STATES,
  ...CALIFORNIA_STATES
]);

export const SOUTHWEST_STATES = DESERT_SOUTHWEST_STATES;

export const GEO_QUERY_PACKS: Partial<
  Record<
    CategoryKey,
    Record<string, string[]>
  >
> = {
  nature_outdoors: {
    // Regional packs
    pacific_northwest: ["rainforest trail", "waterfall hike", "old growth forest", "hot springs"],
    mountain: ["mountain trail", "alpine lake", "scenic overlook", "wildflower meadow"],
    desert_southwest: ["desert preserve", "red rock trail", "slot canyon", "saguaro"],
    gulf_coast: ["bayou trail", "coastal wetlands", "bird sanctuary"],
    atlantic_south: ["beach", "barrier island", "nature preserve", "coastal trail"],
    mid_atlantic: ["bay trail", "estuary", "state park"],
    new_england: ["rocky coast trail", "lighthouse walk", "fall foliage", "covered bridge"],
    great_lakes: ["lakefront trail", "dunes", "riverwalk"],
    california: ["coastal trail", "redwood forest", "canyon hike", "wine country"],
    hawaii: ["volcanic trail", "tropical garden", "waterfall hike", "beach park"],
    alaska: ["glacier viewpoint", "wildlife refuge", "wilderness trail"],
    // Climate-based (supplements regional)
    warm: ["botanical garden", "nature preserve"],
    cold: ["snowshoe trail", "winter hike"]
  },
  sports_rec: {
    pacific_northwest: ["ski resort", "kayak river", "mountain biking", "climbing gym"],
    mountain: ["ski resort", "snowboarding", "mountain biking", "fly fishing"],
    desert_southwest: ["golf course", "rock climbing", "mountain biking", "trail running"],
    gulf_coast: ["fishing charter", "kayak tour", "golf course"],
    atlantic_south: ["beach volleyball", "surfing", "golf course", "fishing pier"],
    mid_atlantic: ["sailing", "kayak rental", "golf course"],
    new_england: ["sailing", "whale watching", "ski resort", "ice skating"],
    great_lakes: ["boat rental", "fishing", "beach volleyball", "ice fishing"],
    california: ["surfing", "mountain biking", "rock climbing", "sailing"],
    hawaii: ["snorkeling", "surfing", "outrigger canoe", "hiking"],
    alaska: ["fishing charter", "kayaking", "dog sledding", "wildlife tour"],
    warm: ["water sports", "outdoor courts"],
    cold: ["ice rink", "indoor sports complex"]
  },
  attractions: {
    pacific_northwest: ["coffee roaster tour", "brewery", "farmers market", "art museum"],
    mountain: ["scenic railway", "hot springs resort", "national park visitor center"],
    desert_southwest: ["desert museum", "native heritage site", "historic pueblo", "observatory"],
    gulf_coast: ["aquarium", "historic district", "plantation tour", "cajun heritage"],
    atlantic_south: ["lighthouse", "historic fort", "aquarium", "pier"],
    mid_atlantic: ["historic site", "maritime museum", "boardwalk"],
    new_england: ["lighthouse", "historic harbor", "maritime museum", "lobster shack"],
    great_lakes: ["lakefront attraction", "science museum", "brewery tour"],
    california: ["winery", "aquarium", "historic mission", "theme park"],
    hawaii: ["luau", "volcano tour", "cultural center", "botanical garden"],
    alaska: ["glacier cruise", "wildlife center", "native heritage", "gold rush history"],
    warm: ["botanical garden", "outdoor attraction"],
    cold: ["indoor attraction", "history museum"]
  }
};

export const SEASON_QUERY_PACKS: Partial<
  Record<
    CategoryKey,
    Record<string, string[]>
  >
> = {
  // Outdoor activities - universally applicable (no region-specific like "ski hill")
  nature_outdoors: {
    winter: ["winter trail", "scenic winter hike", "nature preserve"],
    spring: ["wildflower trail", "botanical garden", "spring bloom"],
    summer: ["shaded trail", "waterfront park", "lake beach"],
    fall: ["fall foliage", "scenic trail", "nature walk"]
  },
  // Sports - indoor focus in winter, outdoor in warm months
  sports_rec: {
    winter: ["indoor sports complex", "fitness center", "climbing gym"],
    spring: ["outdoor courts", "trail running", "golf course"],
    summer: ["water sports", "kayak rental", "outdoor recreation"],
    fall: ["golf course", "outdoor courts", "sports league"]
  },
  // Attractions - indoor in winter, outdoor in summer
  attractions: {
    winter: ["indoor attraction", "museum", "aquarium"],
    spring: ["botanical garden", "outdoor attraction", "historic site"],
    summer: ["outdoor attraction", "festival grounds", "theme park"],
    fall: ["historic site", "harvest festival", "scenic railway"]
  },
  // Community events - seasonal festivals and markets
  community_events: {
    winter: ["holiday market", "winter festival", "tree lighting"],
    spring: ["farmers market", "spring festival", "garden show"],
    summer: ["summer festival", "outdoor concert", "night market"],
    fall: ["harvest festival", "fall market", "pumpkin patch"]
  },
  // Dining - seasonal dining experiences
  dining: {
    winter: ["cozy restaurant", "fireplace dining", "comfort food"],
    spring: ["patio dining", "brunch spot", "farm to table"],
    summer: ["rooftop restaurant", "outdoor dining", "waterfront restaurant"],
    fall: ["harvest menu", "seasonal restaurant", "farm to table"]
  },
  // Coffee & brunch - seasonal drinks and vibes
  coffee_brunch: {
    winter: ["cozy cafe", "fireplace coffee shop", "hot chocolate"],
    spring: ["outdoor cafe", "patio brunch", "seasonal latte"],
    summer: ["iced coffee", "outdoor seating cafe", "cold brew"],
    fall: ["pumpkin spice", "autumn latte", "cozy coffee shop"]
  },
  // Nightlife - seasonal bar/lounge experiences
  nightlife_social: {
    winter: ["cozy bar", "fireplace lounge", "whiskey bar"],
    spring: ["rooftop bar", "patio bar", "beer garden"],
    summer: ["rooftop bar", "beer garden", "outdoor lounge"],
    fall: ["craft beer", "bourbon bar", "wine bar"]
  },
  // Fitness - indoor/outdoor based on weather
  fitness_wellness: {
    winter: ["indoor fitness", "yoga studio", "heated pool"],
    spring: ["outdoor yoga", "boot camp", "running group"],
    summer: ["outdoor fitness", "swim club", "morning workout"],
    fall: ["indoor gym", "yoga studio", "fitness class"]
  },
  // Shopping - seasonal markets and holiday shopping
  shopping: {
    winter: ["holiday shopping", "gift shop", "boutique"],
    spring: ["farmers market", "outdoor market", "garden center"],
    summer: ["outdoor market", "artisan fair", "boutique"],
    fall: ["harvest market", "fall boutique", "artisan shop"]
  }
};

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
    fallbackQueries: [], // Neighborhoods use separate NEIGHBORHOOD_QUERIES
    maxPerQuery: 8,
    minPrimaryResults: 0
  },
  dining: {
    displayLimit: 5,
    poolMax: 40,
    minRating: 4.5,
    minReviews: 100,
    // Generic fallback - only used if audience queries return sparse results
    fallbackQueries: [
      "best local restaurants",
      "popular restaurant"
    ],
    maxPerQuery: 15,
    minPrimaryResults: 3
  },
  coffee_brunch: {
    displayLimit: 5,
    poolMax: 30,
    minRating: 4.4,
    minReviews: 40,
    fallbackQueries: [
      "coffee shop cafe",
      "breakfast brunch spot"
    ],
    maxPerQuery: 12,
    minPrimaryResults: 2
  },
  nature_outdoors: {
    displayLimit: 4,
    poolMax: 20,
    minRating: 4.5,
    minReviews: 20,
    fallbackQueries: [
      "park trail hiking",
      "nature preserve garden"
    ],
    maxPerQuery: 12,
    minPrimaryResults: 2
  },
  entertainment: {
    displayLimit: 4,
    poolMax: 25,
    minRating: 4.0,
    minReviews: 10,
    fallbackQueries: [
      "live music theater entertainment venue"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  attractions: {
    displayLimit: 4,
    poolMax: 15,
    minRating: 4.0,
    minReviews: 10,
    fallbackQueries: [
      "local attraction historic landmark tourist site",
      "zoo aquarium museum"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  sports_rec: {
    displayLimit: 4,
    poolMax: 20,
    minRating: 4.0,
    minReviews: 10,
    fallbackQueries: [
      "sports recreation center"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  arts_culture: {
    displayLimit: 4,
    poolMax: 20,
    minRating: 4.0,
    minReviews: 8,
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
    fallbackQueries: [
      "brewery winery bar lounge"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  fitness_wellness: {
    displayLimit: 4,
    poolMax: 23,
    minRating: 4.0,
    minReviews: 10,
    fallbackQueries: [
      "gym fitness yoga wellness"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  shopping: {
    displayLimit: 4,
    poolMax: 23,
    minRating: 4.0,
    minReviews: 10,
    fallbackQueries: [
      "local shop boutique"
    ],
    maxPerQuery: 10,
    minPrimaryResults: 2
  },
  education: {
    displayLimit: 3,
    poolMax: 10,
    minRating: 3.8,
    minReviews: 200,
    // Education is less audience-dependent, so fallback is primary
    fallbackQueries: [
      "university campus",
      "library"
    ],
    maxPerQuery: 15,
    minPrimaryResults: 0 // Always use fallback for education
  },
  community_events: {
    displayLimit: 3,
    poolMax: 15,
    minRating: 3.8,
    minReviews: 5,
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

const DEFAULT_AUGMENT_LIMITS: Record<AudienceAugmentCategory, number> = {
  entertainment: 6,
  sports_rec: 6,
  nature_outdoors: 6,
  dining: 8,
  fitness_wellness: 6,
  shopping: 6
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
        "trendy restaurant tapas sushi ramen",
        "craft cocktail bar gastropub",
        "vegan vegetarian restaurant"
      ],
      entertainment: [
        "live music venue comedy club",
        "rooftop bar nightclub"
      ],
      sports_rec: [
        "climbing gym crossfit",
        "adult sports league"
      ],
      nature_outdoors: [
        "urban park riverwalk trail",
        "rooftop garden scenic overlook"
      ],
      fitness_wellness: [
        "boutique fitness spin cycling",
        "yoga pilates barre studio"
      ],
      shopping: [
        "vintage boutique thrift",
        "artisan market bookstore"
      ]
    }
  },
  growing_families: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      // Family-friendly, kid-focused
      dining: [
        "family restaurant kids menu",
        "pizza casual dining"
      ],
      entertainment: [
        "family entertainment center arcade",
        "children theater puppet show"
      ],
      sports_rec: [
        "youth sports soccer baseball",
        "community pool splash pad"
      ],
      nature_outdoors: [
        "playground park picnic area",
        "nature center petting zoo",
        "easy hiking family trail"
      ],
      fitness_wellness: [
        "family gym pool",
        "kids yoga swim lessons"
      ],
      shopping: [
        "toy store children boutique",
        "family shopping kids clothes"
      ]
    }
  },
  active_retirees: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      // Classic, refined, accessible
      dining: [
        "fine dining seafood steakhouse",
        "bistro brunch classic restaurant"
      ],
      entertainment: [
        "performing arts symphony opera",
        "historic theater concert hall"
      ],
      sports_rec: [
        "golf course country club",
        "tennis pickleball courts"
      ],
      nature_outdoors: [
        "botanical garden arboretum",
        "scenic overlook easy walk",
        "bird watching nature preserve"
      ],
      fitness_wellness: [
        "wellness spa massage",
        "senior fitness gentle yoga"
      ],
      shopping: [
        "antique shop gallery",
        "bookstore artisan craft"
      ]
    }
  },
  luxury_buyers: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      // Upscale, exclusive, premium
      dining: [
        "fine dining michelin tasting menu",
        "upscale steakhouse sushi omakase"
      ],
      entertainment: [
        "private theater vip lounge",
        "exclusive club members only"
      ],
      sports_rec: [
        "private country club golf",
        "yacht club tennis pro"
      ],
      nature_outdoors: [
        "private garden estate grounds",
        "scenic overlook exclusive"
      ],
      fitness_wellness: [
        "luxury spa resort wellness",
        "private training personal gym"
      ],
      shopping: [
        "designer boutique luxury brand",
        "fine jewelry art gallery"
      ]
    }
  },
  investors_relocators: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      // Popular, well-reviewed, community staples
      dining: [
        "popular restaurant highly rated",
        "local favorite food hall"
      ],
      entertainment: [
        "event venue concert",
        "community theater performance"
      ],
      sports_rec: [
        "recreation center sports complex",
        "stadium arena"
      ],
      nature_outdoors: [
        "state park regional trail",
        "lake river waterfront"
      ],
      fitness_wellness: [
        "fitness center gym",
        "community recreation"
      ],
      shopping: [
        "shopping district main street",
        "local market retail"
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
  "entertainment",
  "sports_rec",
  "nature_outdoors",
  "dining",
  "fitness_wellness",
  "shopping"
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
  return AUDIENCE_CONFIG[audience as AudienceSegment]?.augmentQueries[category] ?? [];
}

/**
 * Get all augment queries for an audience segment.
 */
export function getAllAudienceAugmentQueries(
  audience: string
): Record<AudienceAugmentCategory, string[]> | undefined {
  return AUDIENCE_CONFIG[audience as AudienceSegment]?.augmentQueries;
}

/**
 * Get audience augment limit for a category.
 */
export function getAudienceAugmentLimit(
  audience: string,
  category: AudienceAugmentCategory
): number {
  return AUDIENCE_CONFIG[audience as AudienceSegment]?.augmentLimits[category] ?? 6;
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
