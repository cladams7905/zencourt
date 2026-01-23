import type {
  PlaceDetailsResponse,
  PlaceResult
} from "./communityPlacesClient";

/**
 * Configuration for keyword extraction behavior
 */
export type KeywordConfig = {
  minKeywords: number;
  maxKeywords: number;
};

const DEFAULT_CONFIG: KeywordConfig = {
  minKeywords: 0,
  maxKeywords: 4
};

/**
 * Input for keyword extraction - can include basic place info or full details
 */
export type KeywordInput = {
  place: PlaceResult;
  category: string;
  details?: PlaceDetailsResponse;
};

// ============================================================================
// Text Normalization Utilities
// ============================================================================

function normalizeSummaryText(text: string): string {
  if (typeof text !== "string") {
    return "";
  }
  return text
    .replace(/\s+/g, " ")
    .replace(/[""]/g, '"')
    .replace(/[']/g, "'")
    .trim();
}

function normalizeKeywordText(text: string): string {
  return normalizeSummaryText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeTypeToken(value: string): string {
  return value.replace(/_/g, " ").toLowerCase();
}

function buildTokenSet(text: string): Set<string> {
  if (!text) {
    return new Set();
  }
  return new Set(text.split(" ").filter(Boolean));
}

function expandTokenVariants(token: string): string[] {
  const variants = new Set([token]);
  if (token.endsWith("es") && token.length > 4) {
    variants.add(token.slice(0, -2));
  }
  if (token.endsWith("s") && token.length > 3) {
    variants.add(token.slice(0, -1));
  }
  if (!token.endsWith("s") && token.length > 2) {
    variants.add(`${token}s`);
  }
  return Array.from(variants);
}

function keywordMatches(
  normalizedText: string,
  tokenSet: Set<string>,
  phrase: string
): boolean {
  const normalizedPhrase = normalizeKeywordText(phrase);
  if (!normalizedPhrase) {
    return false;
  }
  const tokens = normalizedPhrase.split(" ").filter(Boolean);
  if (tokens.length === 0) {
    return false;
  }
  const textWithSpaces = ` ${normalizedText} `;
  if (tokens.length === 1) {
    for (const variant of expandTokenVariants(tokens[0])) {
      if (textWithSpaces.includes(` ${variant} `)) {
        return true;
      }
    }
    return false;
  }
  if (normalizedText.includes(normalizedPhrase)) {
    return true;
  }
  const tokenVariants = tokens.map(expandTokenVariants);
  return tokenVariants.every((variants) =>
    variants.some((variant) => tokenSet.has(variant))
  );
}

// ============================================================================
// Keyword Banks by Category (consolidated from REVIEW_KEYWORD_BANKS)
// ============================================================================

const KEYWORD_BANKS: Record<string, string[]> = {
  dining: [
    // Cuisine types
    "american", "southern", "tex-mex", "mexican", "italian", "french", "spanish",
    "greek", "mediterranean", "middle eastern", "indian", "thai", "vietnamese",
    "korean", "japanese", "chinese", "ethiopian", "brazilian", "cuban", "caribbean",
    // Dishes & Foods
    "lobster", "oyster", "seafood", "crab", "steak", "ribeye", "wagyu", "brisket",
    "bbq", "tacos", "burritos", "pizza", "pasta", "sushi", "ramen", "pho",
    "curry", "pad thai", "burger",
    // Style & Experience
    "farm to table", "locally sourced", "tasting menu", "chef's table",
    "outdoor seating", "rooftop", "waterfront", "romantic", "date night",
    "family style", "casual", "upscale", "fine dining"
  ],
  coffee_brunch: [
    // Coffee & Drinks
    "espresso", "latte", "cold brew", "pour over", "nitro", "seasonal latte",
    // Baked Goods
    "fresh baked", "pastries", "croissant", "bagel", "donut", "muffin",
    // Brunch & Breakfast
    "brunch", "pancakes", "waffles", "avocado toast", "breakfast burrito", "eggs benedict",
    // Experience
    "cozy", "study spot", "local roaster", "latte art", "outdoor seating"
  ],
  nightlife_social: [
    // Cocktails & Spirits
    "craft cocktails", "mixologist", "whiskey", "bourbon", "tequila", "mezcal",
    "wine flight", "sommelier", "craft beer", "microbrewery", "taproom",
    // Venue Types
    "speakeasy", "dive bar", "sports bar", "wine bar", "rooftop bar", "beer garden",
    // Entertainment
    "live music", "dj", "karaoke", "trivia night", "happy hour",
    // Ambiance
    "intimate", "upscale", "casual", "lively"
  ],
  nature_outdoors: [
    // Water
    "waterfall", "river", "lake", "creek", "beach", "kayaking", "fishing",
    // Trails
    "hiking trail", "nature trail", "walking path", "easy trail", "challenging",
    // Views
    "scenic views", "panoramic", "overlook", "sunset", "fall foliage",
    // Wildlife
    "wildlife", "birdwatching", "old growth",
    // Activities
    "picnic", "camping", "mountain biking", "dog friendly"
  ],
  entertainment: [
    // Music
    "live music", "concert", "jazz", "rock", "country",
    // Venues
    "small venue", "amphitheater", "intimate",
    // Comedy & Theater
    "comedy club", "stand up", "theater", "musical", "improv",
    // Cinema
    "movie theater", "imax", "indie film",
    // Other
    "arcade", "bowling", "escape room", "trivia night"
  ],
  attractions: [
    // Museums
    "museum", "exhibits", "interactive", "hands-on",
    // Zoos & Aquariums
    "zoo", "aquarium", "wildlife", "animals",
    // Theme Parks
    "theme park", "roller coaster", "water park",
    // Historic
    "historic", "landmark", "architecture",
    // Gardens
    "botanical garden", "sculpture garden",
    // Family
    "family-friendly", "kid friendly", "educational"
  ],
  sports_rec: [
    "golf", "tennis", "pickleball", "basketball", "soccer", "swimming",
    "ice skating", "rock climbing", "kayak", "paddleboard",
    "fitness classes", "sports complex", "recreation center"
  ],
  arts_culture: [
    // Visual Arts
    "art gallery", "museum", "contemporary art", "sculpture", "photography",
    // Performance
    "theater", "ballet", "symphony", "opera",
    // Historic
    "historic", "architecture", "cultural center",
    // Events
    "gallery opening", "art fair", "festival"
  ],
  fitness_wellness: [
    // Gym
    "gym", "fitness center", "free weights",
    // Classes
    "yoga", "pilates", "spin", "hiit", "crossfit",
    // Spa
    "spa", "massage", "facial", "wellness center",
    // Specialized
    "personal trainer", "boutique studio"
  ],
  shopping: [
    // Store Types
    "boutique", "vintage", "antique", "consignment",
    // Products
    "clothing", "jewelry", "home decor", "furniture",
    // Quality
    "handmade", "artisan", "local brands", "curated",
    // Experience
    "locally owned", "unique", "hidden gems"
  ],
  education: [
    "university", "library", "learning center", "community college"
  ],
  community_events: [
    "farmers market", "festival", "craft fair", "street fair"
  ]
};

// ============================================================================
// Type-to-Keyword Mapping (for extracting from Google Place types)
// ============================================================================

const TYPE_KEYWORD_MAP: Record<string, string> = {
  "shopping mall": "shopping",
  "shopping center": "shopping",
  "department store": "shopping",
  "grocery store": "grocery",
  "supermarket": "grocery",
  "university": "university",
  "library": "library",
  "gym": "gym",
  "fitness center": "fitness",
  "yoga studio": "yoga",
  "dog park": "dog park",
  "hiking area": "hiking",
  "state park": "state park",
  "national park": "national park",
  "park": "park",
  "trail": "trail",
  "movie theater": "movies",
  "performing arts theater": "live theater",
  "art gallery": "gallery",
  "museum": "museum",
  "sports complex": "sports",
  "stadium": "stadium",
  "amusement park": "amusement park",
  "water park": "water park",
  "zoo": "zoo",
  "aquarium": "aquarium",
  "botanical garden": "botanical garden",
  "night club": "nightlife",
  "bar": "bar",
  "coffee shop": "coffee",
  "cafe": "cafe",
  "restaurant": "dining"
};

const GENERIC_TYPES = new Set([
  "establishment",
  "point of interest",
  "food",
  "store",
  "place of worship",
  "locality",
  "neighborhood"
]);

// ============================================================================
// Category-specific name/type token mappings
// ============================================================================

const CATEGORY_TOKEN_MAPS: Record<string, Array<[string, string]>> = {
  dining: [
    ["sushi", "sushi"], ["ramen", "ramen"], ["taco", "tacos"],
    ["mexican", "mexican"], ["italian", "italian"], ["thai", "thai"],
    ["vietnamese", "vietnamese"], ["korean", "korean"], ["indian", "indian"],
    ["greek", "greek"], ["mediterranean", "mediterranean"], ["seafood", "seafood"],
    ["steak", "steakhouse"], ["pizza", "pizza"], ["bbq", "bbq"],
    ["barbecue", "bbq"], ["brewery", "brewery"], ["pub", "pub"]
  ],
  coffee_brunch: [
    ["coffee", "coffee"], ["espresso", "espresso"], ["latte", "latte"],
    ["cafe", "cafe"], ["bakery", "bakery"], ["pastry", "pastries"],
    ["brunch", "brunch"], ["breakfast", "breakfast"], ["bagel", "bagel"],
    ["donut", "donut"]
  ],
  nature_outdoors: [
    ["trail", "hiking"], ["hike", "hiking"], ["river", "river"],
    ["lake", "lake"], ["waterfall", "waterfall"], ["scenic", "scenic views"],
    ["bridge", "landmark"], ["historic", "historic"], ["state park", "state park"],
    ["greenway", "greenway"]
  ],
  entertainment: [
    ["movie theater", "movies"], ["theater", "live theater"],
    ["performing arts", "performing arts"], ["museum", "museum"],
    ["art gallery", "gallery"], ["amusement park", "amusement park"],
    ["water park", "water park"], ["zoo", "zoo"], ["aquarium", "aquarium"],
    ["botanical garden", "botanical garden"], ["arcade", "arcade"],
    ["bowling", "bowling"], ["escape room", "escape room"],
    ["ice rink", "ice rink"], ["skating rink", "skating rink"],
    ["sports complex", "sports complex"], ["stadium", "stadium"],
    ["live music", "live music"], ["brewery", "brewery"], ["nightclub", "nightlife"]
  ],
  arts_culture: [
    ["movie theater", "movies"], ["theater", "live theater"],
    ["performing arts", "performing arts"], ["museum", "museum"],
    ["art gallery", "gallery"], ["live music", "live music"]
  ],
  attractions: [
    ["museum", "museum"], ["zoo", "zoo"], ["aquarium", "aquarium"],
    ["botanical garden", "botanical garden"], ["amusement park", "amusement park"],
    ["water park", "water park"]
  ],
  sports_rec: [
    ["sports complex", "sports complex"], ["stadium", "stadium"],
    ["ice rink", "ice rink"], ["skating rink", "skating rink"]
  ],
  nightlife_social: [
    ["brewery", "brewery"], ["nightclub", "nightlife"],
    ["live music", "live music"]
  ]
};

// ============================================================================
// Cuisine Label Extraction
// ============================================================================

const CUISINE_MAPPINGS: Array<[string, string]> = [
  ["mexican", "Mexican"], ["italian", "Italian"], ["thai", "Thai"],
  ["japanese", "Japanese"], ["chinese", "Chinese"], ["indian", "Indian"],
  ["vietnamese", "Vietnamese"], ["korean", "Korean"], ["greek", "Greek"],
  ["mediterranean", "Mediterranean"], ["american", "American"],
  ["bbq", "BBQ"], ["barbecue", "BBQ"], ["seafood", "Seafood"],
  ["steak", "Steakhouse"], ["pizza", "Pizza"], ["bakery", "Bakery"],
  ["brunch", "Brunch"], ["breakfast", "Breakfast"], ["coffee", "Coffee"]
];

function getCuisineLabel(place: PlaceResult): string {
  const types = place.types ?? [];
  const primary = place.primaryType ?? "";
  const combined = [primary, ...types].filter(Boolean);

  for (const [token, label] of CUISINE_MAPPINGS) {
    if (combined.some((value) => value.includes(token))) {
      return label;
    }
  }
  return "";
}

// ============================================================================
// Summary Pattern Extraction
// ============================================================================

const SUMMARY_PATTERNS = [
  /known for ([^.;]+)/i,
  /famous for ([^.;]+)/i,
  /popular for ([^.;]+)/i,
  /renowned for ([^.;]+)/i,
  /features? ([^.;]+)/i,
  /offers? ([^.;]+)/i,
  /serves? ([^.;]+)/i,
  /specializes in ([^.;]+)/i,
  /best for ([^.;]+)/i,
  /highlights? ([^.;]+)/i,
  /notable for ([^.;]+)/i
];

const HIGHLIGHT_KEYWORDS: Record<string, string[]> = {
  base: [
    "waterfront", "riverwalk", "scenic views", "historic", "family-friendly",
    "outdoor seating", "rooftop", "award-winning", "walking trails",
    "botanical gardens", "local art", "seasonal menu"
  ],
  dining: [
    "signature dishes", "house-made", "tasting menu", "chef-driven", "healthy", "vegan",
    "farm-to-table", "fresh seafood", "handmade pasta", "wood-fired",
    "locally sourced", "daily specials", "homemade desserts"
  ],
  nightlife_social: [
    "craft cocktails", "small batch", "tasting room", "live music",
    "late-night", "wine flights", "whiskey selection", "taproom", "patio seating"
  ],
  default: [
    "guided tours", "interactive exhibits", "family programs", "nature trails",
    "river access", "scenic overlooks", "historic architecture",
    "outdoor concerts", "special exhibits"
  ]
};

const STOPWORDS = new Set([
  "the", "and", "with", "that", "this", "from", "for", "your",
  "their", "its", "our", "area", "local", "nearby", "spot", "place", "location"
]);

// ============================================================================
// Attribute-to-Keyword Mapping
// ============================================================================

type AttributeMapping = {
  key: keyof PlaceDetailsResponse;
  label: string;
  categories?: string[];
};

const ATTRIBUTE_MAPPINGS: AttributeMapping[] = [
  { key: "servesCocktails", label: "craft cocktails", categories: ["dining", "nightlife_social"] },
  { key: "servesWine", label: "wine selection", categories: ["dining", "nightlife_social"] },
  { key: "servesBeer", label: "local beer", categories: ["dining", "nightlife_social"] },
  { key: "servesCoffee", label: "coffee", categories: ["coffee_brunch"] },
  { key: "servesBrunch", label: "brunch", categories: ["coffee_brunch"] },
  { key: "servesBreakfast", label: "breakfast", categories: ["coffee_brunch"] },
  { key: "servesLunch", label: "lunch", categories: ["dining", "nightlife_social"] },
  { key: "servesDinner", label: "dinner", categories: ["dining", "nightlife_social"] },
  { key: "servesDessert", label: "dessert", categories: ["dining", "nightlife_social"] },
  { key: "servesVegetarianFood", label: "vegetarian options", categories: ["dining", "nightlife_social"] },
  { key: "outdoorSeating", label: "outdoor seating" },
  { key: "liveMusic", label: "live music" },
  { key: "goodForGroups", label: "group-friendly" },
  { key: "goodForChildren", label: "family-friendly" },
  { key: "reservable", label: "reservations", categories: ["dining", "nightlife_social"] },
  { key: "dineIn", label: "dine-in", categories: ["dining", "nightlife_social"] },
  { key: "takeout", label: "takeout", categories: ["dining", "nightlife_social"] }
];

const PRICE_LEVEL_MAP: Record<string, string> = {
  PRICE_LEVEL_INEXPENSIVE: "budget-friendly",
  PRICE_LEVEL_MODERATE: "mid-range",
  PRICE_LEVEL_EXPENSIVE: "upscale",
  PRICE_LEVEL_VERY_EXPENSIVE: "luxury"
};

// ============================================================================
// KeywordExtractor Class - Unified Keyword Extraction
// ============================================================================

/**
 * Unified keyword extractor that consolidates all keyword extraction logic
 * from multiple sources: place types, names, reviews, summaries, and attributes.
 */
export class KeywordExtractor {
  private config: KeywordConfig;

  constructor(config: Partial<KeywordConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Primary entry point - extracts keywords from all available sources
   */
  extract(input: KeywordInput): string[] {
    const { place, category, details } = input;

    if (details) {
      const reviewCandidates = new Set<string>();
      this.extractFromReviews(details.reviews, category, reviewCandidates);
      if (reviewCandidates.size > 0) {
        return this.rankAndLimit(Array.from(reviewCandidates));
      }
    }

    const candidates = new Set<string>();

    // 1. Extract from place types (fast, always available)
    this.extractFromTypes(place, category, candidates);

    // 2. Extract from place name (fast, always available)
    this.extractFromName(place, category, candidates);

    // 3. If details available, extract from summary/attributes
    if (details) {
      this.extractFromSummary(
        details.reviewSummary?.text || details.editorialSummary?.text,
        category,
        candidates
      );
      this.extractFromAttributes(details, category, candidates);
    }

    return this.rankAndLimit(Array.from(candidates));
  }

  /**
   * Extract keywords from Google Place types
   */
  private extractFromTypes(
    place: PlaceResult,
    category: string,
    candidates: Set<string>
  ): void {
    const types = [place.primaryType ?? "", ...(place.types ?? [])]
      .filter(Boolean)
      .map(normalizeTypeToken);

    // Map known types to keywords
    for (const type of types) {
      if (candidates.size >= this.config.maxKeywords) break;
      if (GENERIC_TYPES.has(type)) continue;

      const mapped = TYPE_KEYWORD_MAP[type];
      if (mapped) {
        candidates.add(mapped);
      }
    }

    // Get cuisine label for dining category
    if (category === "dining") {
      const cuisineLabel = getCuisineLabel(place);
      if (cuisineLabel) {
        candidates.add(cuisineLabel.toLowerCase());
      }
    }
  }

  /**
   * Extract keywords by matching tokens in place name against category mappings
   */
  private extractFromName(
    place: PlaceResult,
    category: string,
    candidates: Set<string>
  ): void {
    const name = (place.displayName?.text || "").toLowerCase();
    const types = [place.primaryType ?? "", ...(place.types ?? [])]
      .filter(Boolean)
      .map(normalizeTypeToken);

    // Check for family-friendly indicators
    if (name.includes("family") || name.includes("kids")) {
      candidates.add("family-friendly");
    }

    // Get category-specific token map (or use maps for related categories)
    const tokenMaps = this.getTokenMapsForCategory(category);

    for (const tokenMap of tokenMaps) {
      for (const [token, label] of tokenMap) {
        if (candidates.size >= this.config.maxKeywords) return;
        if (name.includes(token) || types.some((t) => t.includes(token))) {
          candidates.add(label);
        }
      }
    }
  }

  /**
   * Get applicable token maps for a category (some categories share mappings)
   */
  private getTokenMapsForCategory(category: string): Array<Array<[string, string]>> {
    const maps: Array<Array<[string, string]>> = [];

    // Direct category match
    if (CATEGORY_TOKEN_MAPS[category]) {
      maps.push(CATEGORY_TOKEN_MAPS[category]);
    }

    // Categories that share the entertainment/activity mappings
    const sharedActivityCategories = [
      "entertainment", "arts_culture", "attractions", "sports_rec", "nightlife_social"
    ];
    if (sharedActivityCategories.includes(category) && CATEGORY_TOKEN_MAPS.entertainment) {
      if (!maps.includes(CATEGORY_TOKEN_MAPS.entertainment)) {
        maps.push(CATEGORY_TOKEN_MAPS.entertainment);
      }
    }

    return maps;
  }

  /**
   * Extract keywords from review text by matching against keyword bank
   */
  private extractFromReviews(
    reviews: PlaceDetailsResponse["reviews"],
    category: string,
    candidates: Set<string>
  ): void {
    if (!reviews || reviews.length === 0) return;

    const bank = KEYWORD_BANKS[category] ?? [];
    if (bank.length === 0) return;

    const seen = new Set<string>();

    for (const review of reviews) {
      const rating = review?.rating ?? 0;
      if (rating < 4) continue;

      const reviewText = this.getReviewText(review);
      const normalizedText = normalizeKeywordText(reviewText);
      if (!normalizedText) continue;

      const tokenSet = buildTokenSet(normalizedText);

      for (const phrase of bank) {
        if (candidates.size >= this.config.maxKeywords) return;

        const normalized = normalizeKeywordText(phrase);
        if (!normalized || seen.has(normalized)) continue;

        if (keywordMatches(normalizedText, tokenSet, phrase)) {
          seen.add(normalized);
          candidates.add(phrase);
        }
      }
    }
  }

  /**
   * Extract review text from various formats
   */
  private getReviewText(
    review: NonNullable<PlaceDetailsResponse["reviews"]>[number]
  ): string {
    const raw = review?.text;
    if (!raw) return "";
    if (typeof raw === "string") return raw;
    if (typeof raw === "object" && typeof raw.text === "string") return raw.text;
    return "";
  }

  /**
   * Extract keywords from editorial/review summary using pattern matching
   */
  private extractFromSummary(
    text: string | undefined,
    category: string,
    candidates: Set<string>
  ): void {
    if (!text) return;

    const normalized = normalizeSummaryText(text);
    if (!normalized) return;

    const phrases: string[] = [];

    // Extract phrases using patterns like "known for X"
    for (const pattern of SUMMARY_PATTERNS) {
      const match = normalized.match(pattern);
      if (match?.[1]) {
        match[1]
          .split(/,| and |\/|;/i)
          .map((part) => part.trim())
          .filter(Boolean)
          .forEach((part) => phrases.push(part));
      }
    }

    // Check for highlight keywords
    const highlights = this.getHighlightKeywords(category);
    const normalizedLower = normalized.toLowerCase();
    for (const highlight of highlights) {
      if (normalizedLower.includes(highlight)) {
        phrases.push(highlight);
      }
    }

    // Clean and add phrases
    for (const phrase of phrases) {
      if (candidates.size >= this.config.maxKeywords) return;

      const cleaned = phrase
        .replace(/["']/g, "")
        .replace(/\s+/g, " ")
        .trim();

      if (cleaned.length <= 3) continue;

      // Remove stopwords and limit to 4 words
      const parts = cleaned
        .split(" ")
        .filter((word) => !STOPWORDS.has(word.toLowerCase()))
        .slice(0, 4);

      if (parts.length > 0) {
        candidates.add(parts.join(" "));
      }
    }
  }

  /**
   * Get highlight keywords for a category
   */
  private getHighlightKeywords(category: string): string[] {
    const base = HIGHLIGHT_KEYWORDS.base;
    const categorySpecific = HIGHLIGHT_KEYWORDS[category] ?? HIGHLIGHT_KEYWORDS.default;
    return [...base, ...categorySpecific];
  }

  /**
   * Extract keywords from place detail attributes (outdoor seating, live music, etc.)
   */
  private extractFromAttributes(
    details: PlaceDetailsResponse,
    category: string,
    candidates: Set<string>
  ): void {
    for (const mapping of ATTRIBUTE_MAPPINGS) {
      if (candidates.size >= this.config.maxKeywords) return;

      // Skip if attribute has category restriction and current category doesn't match
      if (mapping.categories && !mapping.categories.includes(category)) {
        continue;
      }

      const value = details[mapping.key];
      if (value === true) {
        candidates.add(mapping.label);
      }
    }

    // Add price level keyword
    if (details.priceLevel) {
      const priceLabel = PRICE_LEVEL_MAP[details.priceLevel];
      if (priceLabel) {
        candidates.add(priceLabel);
      }
    }
  }

  /**
   * Rank keywords and limit to max count
   */
  private rankAndLimit(keywords: string[]): string[] {
    // Simple ranking: prefer shorter, more specific keywords
    return keywords
      .sort((a, b) => {
        // Prefer keywords with fewer words (more specific)
        const aWords = a.split(" ").length;
        const bWords = b.split(" ").length;
        if (aWords !== bWords) return aWords - bWords;
        // Then alphabetically for consistency
        return a.localeCompare(b);
      })
      .slice(0, this.config.maxKeywords);
  }
}
