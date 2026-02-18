import type { ListingContentSubcategory } from "@shared/types/models";

export const ORSHOT_PARAMETER_KEYS = [
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

export type OrshotParameterKey = (typeof ORSHOT_PARAMETER_KEYS)[number];

export type OrshotTemplateConfig = {
  id: string;
  subcategories: ListingContentSubcategory[];
  requiredParams: OrshotParameterKey[];
  supportsHeaderTag?: boolean;
};

export type OrshotCaptionSlideInput = {
  header: string;
  content: string;
};

export type OrshotCaptionItemInput = {
  id: string;
  hook: string | null;
  caption: string | null;
  body: OrshotCaptionSlideInput[];
};

export type ListingOrshotRenderRequest = {
  listingId: string;
  subcategory: ListingContentSubcategory;
  captionItems: OrshotCaptionItemInput[];
  templateCount?: number;
  siteOrigin?: string | null;
};

export type ListingOrshotRenderedItem = {
  templateId: string;
  imageUrl: string;
  captionItemId: string;
  parametersUsed: Partial<Record<OrshotParameterKey, string>>;
};

export type ListingOrshotRenderResult = {
  items: ListingOrshotRenderedItem[];
  failedTemplateIds: string[];
};
