import type {
  AudienceAugmentCategory,
  AudienceConfig,
  AudienceSegment
} from "./types";

const DEFAULT_AUGMENT_LIMITS: Partial<Record<AudienceAugmentCategory, number>> = {
  entertainment: 6,
  sports_rec: 6,
  nature_outdoors: 6,
  dining: 10,
  fitness_wellness: 6,
  shopping: 6,
  coffee_brunch: 6,
  nightlife_social: 6,
  arts_culture: 6,
  attractions: 6,
  education: 6,
  community_events: 6
};

export const AUDIENCE_CONFIG: Record<AudienceSegment, AudienceConfig> = {
  first_time_homebuyers: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      dining: ["affordable local restaurant", "budget-friendly dining"],
      nightlife_social: ["affordable brewery pub", "casual bar with live music"]
    }
  },
  growing_families: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      dining: ["family restaurant kids menu"],
      nature_outdoors: ["playground park picnic area"]
    }
  },
  downsizers_retirees: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      dining: ["fine dining seafood steakhouse", "bistro classic restaurant"],
      nature_outdoors: ["botanical garden arboretum"]
    }
  },
  luxury_homebuyers: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      dining: ["fine dining michelin tasting menu", "upscale steakhouse bistro"],
      nature_outdoors: ["private garden estate grounds"]
    }
  },
  investors_relocators: {
    augmentLimits: DEFAULT_AUGMENT_LIMITS,
    augmentQueries: {
      dining: ["local restaurant"],
      coffee_brunch: ["coffee shop cafe"]
    }
  }
};

export const AUDIENCE_AUGMENT_CATEGORIES: AudienceAugmentCategory[] = [
  "dining",
  "coffee_brunch",
  "nightlife_social",
  "nature_outdoors"
];

export function getAudienceConfig(audience: string): AudienceConfig | undefined {
  return AUDIENCE_CONFIG[audience as AudienceSegment];
}

export function getAudienceAugmentQueries(
  audience: string,
  category: AudienceAugmentCategory
): string[] {
  return AUDIENCE_CONFIG[audience as AudienceSegment]?.augmentQueries?.[category] ?? [];
}

export function getAllAudienceAugmentQueries(
  audience: string
): Partial<Record<AudienceAugmentCategory, string[]>> | undefined {
  return AUDIENCE_CONFIG[audience as AudienceSegment]?.augmentQueries;
}

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
