import type {
  ListingContentSubcategory
} from "@shared/types/models";
import type {
  TemplateHeaderLength,
  TemplateRenderParameterKey
} from "@web/src/lib/domain/media/templateRender/types";

export function applySubheaderPolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  subcategory: ListingContentSubcategory;
  headerLength: TemplateHeaderLength;
  forceListingAddressSubheader?: boolean;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const next = { ...params.resolvedParameters };
  const aiSubheader1 = next.subheader1Text?.trim() ?? "";
  const aiSubheader2 = next.subheader2Text?.trim() ?? "";
  const listingAddress = next.listingAddress?.trim() ?? "";
  const openHouseDateTime = next.openHouseDateTime?.trim() ?? "";
  const featureFallback =
    next.feature1?.trim() ?? next.feature2?.trim() ?? next.feature3?.trim() ?? "";

  if (
    params.subcategory === "open_house" &&
    listingAddress &&
    openHouseDateTime
  ) {
    next.subheader1Text = openHouseDateTime;
    next.subheader2Text = aiSubheader2 || listingAddress || openHouseDateTime;
    return next;
  }

  if (params.forceListingAddressSubheader && listingAddress) {
    next.subheader1Text = listingAddress;
    next.subheader2Text = listingAddress;
    return next;
  }

  if (params.headerLength === "short") {
    next.subheader1Text = aiSubheader1 || listingAddress || featureFallback;
    next.subheader2Text =
      aiSubheader2 || listingAddress || featureFallback || aiSubheader1;
    return next;
  }

  next.subheader1Text = aiSubheader1 || listingAddress || featureFallback;
  next.subheader2Text =
    aiSubheader2 || featureFallback || listingAddress || aiSubheader1;
  return next;
}
