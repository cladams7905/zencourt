import type {
  ListingContentItem,
  TextOverlayInput
} from "@web/src/lib/domain/listings/content";
import type { PreviewTextOverlay } from "@shared/types/video";
import type { TimelinePreviewResolvedSegment } from "@web/src/components/listings/create/media/video/components/ListingTimelinePreviewComposition";
import type { PlayablePreviewSaveTarget } from "@web/src/lib/domain/listings/content/create";

export type {
  PlayablePreviewSaveTarget,
  PlayablePreviewTextUpdate
} from "@web/src/lib/domain/listings/content/create";

export type ListingImagePreviewSlide = {
  id: string;
  imageUrl: string | null;
  header: string;
  content: string;
  textOverlay?: TextOverlayInput | null;
};

export type ListingImagePreviewItem = {
  id: string;
  variationNumber: number;
  hook: string | null;
  caption: string | null;
  slides: ListingImagePreviewSlide[];
  coverImageUrl: string | null;
  isTemplateRender?: boolean;
  captionItemId?: string;
};

export type PlayablePreview = {
  id: string;
  resolvedSegments: TimelinePreviewResolvedSegment[];
  thumbnailOverlay: PreviewTextOverlay | null;
  thumbnailAddressOverlay:
    | TimelinePreviewResolvedSegment["supplementalAddressOverlay"]
    | null;
  firstThumb: string | null;
  durationInFrames: number;
  captionItem: ListingContentItem | null;
  captionItemKey?: PlayablePreviewSaveTarget;
  variationNumber: number;
};

export type ListingClipVersionItem = {
  clipId: string;
  roomName: string;
  roomId?: string | null;
  clipIndex: number;
  sortOrder: number;
  currentVersion: ListingContentItem;
  inFlightVersion?: ListingContentItem | null;
  versions: ListingContentItem[];
};
