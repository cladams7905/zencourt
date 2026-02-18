import type { ListingContentSubcategory } from "@shared/types/models";

export type DashboardContentType = "videos" | "posts" | "stories";

export type DashboardContentCategory =
  | "listing"
  | "market_insights"
  | "educational"
  | "community"
  | "lifestyle"
  | "seasonal";

export type DashboardFilterLabel =
  | "Listings"
  | "Market Insights"
  | "Educational"
  | "Community"
  | "Lifestyle"
  | "Seasonal";

export type AspectRatio = "square" | "vertical" | "horizontal";
export type GenerationModel = "veo3.1_fast" | "runway-gen4-turbo" | "kling1.6";
export type ListingMediaType = "video" | "image";

export type TextOverlayInput = {
  accent_top?: string | null;
  headline: string;
  accent_bottom?: string | null;
};

export type CarouselSlide = {
  header: string;
  content: string;
  broll_query?: string | null;
  text_overlay?: TextOverlayInput | null;
};

export type DashboardContentItem = {
  id: string;
  thumbnail?: string;
  videoUrl?: string | null;
  aspectRatio?: AspectRatio;
  isFavorite?: boolean;
  alt?: string;
  hook?: string;
  caption?: string | null;
  body?: CarouselSlide[] | null;
  brollQuery?: string | null;
  category?: string | null;
  durationSeconds?: number | null;
  generationModel?: GenerationModel | null;
  orientation?: "vertical" | "landscape" | null;
  isPriorityCategory?: boolean;
  listingSubcategory?: ListingContentSubcategory | null;
  mediaType?: ListingMediaType | null;
};

export type GeneratedContentState = Record<
  DashboardContentType,
  Record<DashboardContentCategory, DashboardContentItem[]>
>;

export type DashboardStreamItem = {
  hook: string;
  body?: { header: string; content: string; broll_query?: string | null }[] | null;
  caption?: string | null;
  broll_query?: string | null;
};

export type DashboardGenerationEvent =
  | { type: "delta"; text: string }
  | { type: "done"; items: DashboardStreamItem[] }
  | { type: "error"; message: string };
