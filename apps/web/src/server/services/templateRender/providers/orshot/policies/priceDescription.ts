import type { TemplateRenderParameterKey } from "@web/src/lib/domain/media/templateRender/types";

export function applyPriceDescriptionPolicy(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const next = { ...params.resolvedParameters };
  const priceLabel = next.priceLabel?.trim() ?? "";
  const listingPrice = next.listingPrice?.trim() ?? "";

  next.priceDescription = [priceLabel, listingPrice].filter(Boolean).join(" ");

  return next;
}
