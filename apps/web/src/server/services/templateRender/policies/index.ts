import type { ListingContentSubcategory } from "@shared/types/models";
import type {
  TemplateHeaderLength,
  TemplateRenderParameterKey
} from "@web/src/lib/domain/media/templateRender/types";
import { applyHeaderPolicy } from "./headerPolicy";
import { applySubheaderPolicy } from "./subheaderPolicy";

const DEFAULT_HEADER_LENGTH: TemplateHeaderLength = "medium";

export function applyTemplatePolicies(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  headerLength?: TemplateHeaderLength;
  subcategory: ListingContentSubcategory;
  random?: () => number;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const headerLength = params.headerLength ?? DEFAULT_HEADER_LENGTH;
  const withHeaderPolicy = applyHeaderPolicy({
    resolvedParameters: params.resolvedParameters,
    headerLength,
    subcategory: params.subcategory,
    random: params.random
  });

  return applySubheaderPolicy({
    resolvedParameters: withHeaderPolicy,
    headerLength
  });
}
