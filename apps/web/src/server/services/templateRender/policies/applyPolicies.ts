import type { ListingContentSubcategory } from "@shared/types/models";
import type {
  TemplateHeaderLength,
  TemplateRenderParameterKey
} from "@web/src/lib/domain/media/templateRender/types";
import type { ListingPropertyDetails } from "@shared/types/models";
import { applyHeaderPolicy } from "./header";
import { applySubheaderPolicy } from "./subheader";
import { sanitizeAddress } from "./address";
import { applyFeaturePolicy } from "./feature";
import { applyContactPolicy } from "./contact";

const DEFAULT_HEADER_LENGTH: TemplateHeaderLength = "medium";

export function applyTemplatePolicies(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  headerLength?: TemplateHeaderLength;
  subcategory: ListingContentSubcategory;
  details?: ListingPropertyDetails | null;
  contactSource?: Record<string, unknown>;
  random?: () => number;
}): Partial<Record<TemplateRenderParameterKey, string>> {
  const withParameterPolicies = (() => {
    if (!params.details && !params.contactSource) {
      return params.resolvedParameters;
    }

    const withFeaturePolicy = applyFeaturePolicy({
      resolvedParameters: params.resolvedParameters,
      details: params.details ?? null
    });
    const rawAddress = withFeaturePolicy.listingAddress?.trim() ?? "";
    const withAddressPolicy = {
      ...withFeaturePolicy,
      listingAddress: sanitizeAddress(rawAddress)
    };

    return applyContactPolicy({
      resolvedParameters: withAddressPolicy,
      contactSource: params.contactSource ?? {},
      random: params.random
    });
  })();

  const headerLength = params.headerLength ?? DEFAULT_HEADER_LENGTH;
  const withHeaderPolicy = applyHeaderPolicy({
    resolvedParameters: withParameterPolicies,
    headerLength,
    subcategory: params.subcategory,
    random: params.random
  });

  return applySubheaderPolicy({
    resolvedParameters: withHeaderPolicy,
    headerLength
  });
}
