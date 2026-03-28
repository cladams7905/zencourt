import type { ListingContentSubcategory } from "@shared/types/models";
import type {
  OverlayFontPairing,
  PreviewTextOverlayBackground,
  PreviewTextOverlayPosition
} from "@shared/types/video";

export type ListingContentType = "videos" | "posts" | "stories";

export type ContentCategory =
  | "listing"
  | "market_insights"
  | "educational"
  | "community"
  | "lifestyle"
  | "seasonal";

export type ContentFilterLabel =
  | "Listings"
  | "Market Insights"
  | "Educational"
  | "Community"
  | "Lifestyle"
  | "Seasonal";

export type ListingAspectRatio = "square" | "vertical" | "horizontal";
export type ListingGenerationModel =
  | "gen4.5"
  | "veo3.1_fast"
  | "runway-gen4-turbo"
  | "kling1.6";
export type ListingMediaType = "video" | "image";
export type ReelClipSourceType = "listing_clip" | "user_media";
export type ListingContentSource = "cached_create" | "saved_content";

export type ReelSequenceItem = {
  sourceType: ReelClipSourceType;
  sourceId: string;
  durationSeconds: number;
};

export type ReelOverlaySettings = {
  overlayBackground?: PreviewTextOverlayBackground | null;
  overlayPosition?: PreviewTextOverlayPosition | null;
  overlayFontPairing?: OverlayFontPairing | null;
  showAddress?: boolean | null;
};

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

export type ListingContentItem = ReelOverlaySettings & {
  id: string;
  clipVersionId?: string;
  thumbnail?: string;
  videoUrl?: string | null;
  aspectRatio?: ListingAspectRatio;
  isFavorite?: boolean;
  alt?: string;
  hook?: string;
  caption?: string | null;
  body?: CarouselSlide[] | null;
  brollQuery?: string | null;
  category?: string | null;
  durationSeconds?: number | null;
  generationModel?: ListingGenerationModel | null;
  orientation?: "vertical" | "landscape" | null;
  isPriorityCategory?: boolean;
  listingSubcategory?: ListingContentSubcategory | null;
  mediaType?: ListingMediaType | null;
  roomId?: string | null;
  roomName?: string | null;
  clipIndex?: number | null;
  sortOrder?: number | null;
  prompt?: string | null;
  versionNumber?: number | null;
  isCurrentVersion?: boolean;
  versionStatus?: "pending" | "processing" | "completed" | "failed" | "canceled";
  generatedAt?: string | Date | null;
  orderedClipIds?: string[] | null;
  clipDurationOverrides?: Record<string, number> | null;
  contentSource?: ListingContentSource;
  savedContentId?: string;
  reelSequence?: ReelSequenceItem[] | null;
  reelClipSource?: ReelClipSourceType;
};

export type ListingGeneratedContentState = Record<
  ListingContentType,
  Record<ContentCategory, ListingContentItem[]>
>;

export type ListingContentStreamItem = {
  hook: string;
  body?: { header: string; content: string; broll_query?: string | null }[] | null;
  caption?: string | null;
  broll_query?: string | null;
};

export type ListingContentGenerationEvent =
  | { type: "delta"; text: string }
  | { type: "done"; items: ListingContentStreamItem[] }
  | { type: "error"; message: string };
