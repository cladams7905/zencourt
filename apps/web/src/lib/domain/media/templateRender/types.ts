import type { ListingContentSubcategory } from "@shared/types/models";

export const TEMPLATE_RENDER_PARAMETER_KEYS = [
  "headerText",
  "headerTag",
  "headerTextTop",
  "headerTextBottom",
  "subheader1Text",
  "subheader2Text",
  "arrowImage",
  "bedCount",
  "bathCount",
  "garageCount",
  "squareFootage",
  "listingPrice",
  "priceLabel",
  "priceDescription",
  "propertyDescription",
  "backgroundImage1",
  "backgroundImage2",
  "backgroundImage3",
  "backgroundImage4",
  "backgroundImage5",
  "listingAddress",
  "feature1",
  "feature2",
  "feature3",
  "featureList",
  "openHouseDateTime",
  "socialHandle",
  "realtorName",
  "realtorProfileImage",
  "realtorContactInfo",
  "realtorContact1",
  "realtorContact2",
  "realtorContact3"
] as const;

export type TemplateRenderParameterKey =
  (typeof TEMPLATE_RENDER_PARAMETER_KEYS)[number];

export type TemplateRenderConfig = {
  id: string;
  subcategories: ListingContentSubcategory[];
  requiredParams: TemplateRenderParameterKey[];
  supportsHeaderTag?: boolean;
};

export type TemplateRenderCaptionSlideInput = {
  header: string;
  content: string;
};

export type TemplateRenderCaptionItemInput = {
  id: string;
  hook: string | null;
  caption: string | null;
  body: TemplateRenderCaptionSlideInput[];
  /** When present, template render API can read/update the unified content cache for this item. */
  cacheKeyTimestamp?: number;
  cacheKeyId?: number;
};

export type ListingTemplateRenderRequest = {
  listingId: string;
  subcategory: ListingContentSubcategory;
  captionItems: TemplateRenderCaptionItemInput[];
  templateCount?: number;
  siteOrigin?: string | null;
};

export type ListingTemplateRenderedItem = {
  templateId: string;
  imageUrl: string;
  captionItemId: string;
  parametersUsed: Partial<Record<TemplateRenderParameterKey, string>>;
  /** When true, client shows text overlay; when false/absent, template-only display. */
  isFallback?: boolean;
};

export type ListingTemplateRenderResult = {
  items: ListingTemplateRenderedItem[];
  failedTemplateIds: string[];
};
