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
import { applyGarageLabelPolicy } from "./garageLabel";
import { applySocialHandleIconPolicy } from "./socialHandleIcon";
import type { TemplateHeaderRotationStore } from "../../../rotation";

const DEFAULT_HEADER_LENGTH: TemplateHeaderLength = "medium";

export async function applyTemplatePolicies(params: {
  resolvedParameters: Partial<Record<TemplateRenderParameterKey, string>>;
  headerLength?: TemplateHeaderLength;
  forceUppercaseHeader?: boolean;
  forceListingAddressSubheader?: boolean;
  headerRotationStore?: TemplateHeaderRotationStore;
  subcategory: ListingContentSubcategory;
  details?: ListingPropertyDetails | null;
  contactSource?: Record<string, unknown>;
  rotationKey?: string;
  random?: () => number;
}): Promise<Partial<Record<TemplateRenderParameterKey, string>>> {
  const withParameterPolicies = (() => {
    if (!params.details && !params.contactSource) {
      return params.resolvedParameters;
    }

    const withFeaturePolicy = applyFeaturePolicy({
      resolvedParameters: params.resolvedParameters,
      details: params.details ?? null,
      random: params.random
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
  const withHeaderPolicy = await applyHeaderPolicy({
    resolvedParameters: withParameterPolicies,
    headerLength,
    forceUppercaseHeader: params.forceUppercaseHeader,
    rotationStore: params.headerRotationStore,
    subcategory: params.subcategory,
    rotationKey: params.rotationKey,
    random: params.random
  });

  const withSubheaderPolicy = applySubheaderPolicy({
    resolvedParameters: withHeaderPolicy,
    headerLength,
    forceListingAddressSubheader: params.forceListingAddressSubheader
  });

  const withGarageLabelPolicy = applyGarageLabelPolicy({
    resolvedParameters: withSubheaderPolicy
  });

  return applySocialHandleIconPolicy({
    resolvedParameters: withGarageLabelPolicy
  });
}
