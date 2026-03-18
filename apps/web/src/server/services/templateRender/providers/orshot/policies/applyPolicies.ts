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
import { applyPropertyDescriptionPolicy } from "./propertyDescription";
import { applyPriceDescriptionPolicy } from "./priceDescription";
import { applyContactPolicy } from "./contact";
import { applyGarageLabelPolicy } from "./garageLabel";
import { applySocialHandleIconPolicy } from "./socialHandleIcon";
import { applyAgentProfileImagePolicy } from "./agentProfileImage";
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
    const shouldApplyContactAndFeaturePolicies =
      Boolean(params.details) || Boolean(params.contactSource);

    const base = shouldApplyContactAndFeaturePolicies
      ? (() => {
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
        })()
      : params.resolvedParameters;

    const withPropertyDescriptionPolicy = applyPropertyDescriptionPolicy({
      resolvedParameters: base,
      details: params.details ?? null
    });

    return applyPriceDescriptionPolicy({
      resolvedParameters: withPropertyDescriptionPolicy
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
    subcategory: params.subcategory,
    headerLength,
    forceListingAddressSubheader: params.forceListingAddressSubheader
  });

  const withGarageLabelPolicy = applyGarageLabelPolicy({
    resolvedParameters: withSubheaderPolicy
  });

  const withAgentProfileImagePolicy = applyAgentProfileImagePolicy({
    resolvedParameters: withGarageLabelPolicy
  });

  return applySocialHandleIconPolicy({
    resolvedParameters: withAgentProfileImagePolicy
  });
}
