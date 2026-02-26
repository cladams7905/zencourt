import type {
  TemplateHeaderLength,
  TemplateRenderParameterKey
} from "@web/src/lib/domain/media/templateRender/types";

export function applySubheaderPolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  headerLength: TemplateHeaderLength;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const next = { ...params.resolvedParameters };
  const aiSubheader1 = next.subheader1Text?.trim() ?? "";
  const aiSubheader2 = next.subheader2Text?.trim() ?? "";
  const listingAddress = next.listingAddress?.trim() ?? "";
  const featureFallback =
    next.feature1?.trim() ?? next.feature2?.trim() ?? next.feature3?.trim() ?? "";

  if (params.headerLength === "short") {
    next.subheader1Text = listingAddress || aiSubheader1 || featureFallback;
    next.subheader2Text =
      aiSubheader1 || aiSubheader2 || featureFallback || listingAddress;
    return next;
  }

  next.subheader1Text = aiSubheader1 || listingAddress || featureFallback;
  next.subheader2Text =
    aiSubheader2 || featureFallback || listingAddress || aiSubheader1;
  return next;
}
