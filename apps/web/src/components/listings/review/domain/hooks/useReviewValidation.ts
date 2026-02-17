import * as React from "react";
import type { ListingPropertyDetails } from "@shared/types/models";

type UseReviewValidationParams = {
  details: ListingPropertyDetails;
  targetAudiences?: string[] | null;
};

export const useReviewValidation = ({
  details,
  targetAudiences
}: UseReviewValidationParams) => {
  const audienceSet = React.useMemo(
    () => new Set((targetAudiences ?? []).map((entry) => entry.toLowerCase())),
    [targetAudiences]
  );

  const showInvestorFields =
    audienceSet.has("real_estate_investors") ||
    audienceSet.has("luxury_homebuyers") ||
    audienceSet.has("downsizers_retirees");

  const requiredFixes = React.useMemo(() => {
    const fixes: string[] = [];
    if (!details.property_type?.trim()) {
      fixes.push("Property type is missing.");
    }
    if (!Number.isFinite(details.living_area_sq_ft ?? NaN)) {
      fixes.push("Living area is missing.");
    }
    if (!Number.isFinite(details.bedrooms ?? NaN)) {
      fixes.push("Bedrooms count is missing.");
    }
    if (!Number.isFinite(details.bathrooms ?? NaN)) {
      fixes.push("Bathrooms count is missing.");
    }
    if (!Number.isFinite(details.stories ?? NaN)) {
      fixes.push("Stories count is missing.");
    }
    return fixes;
  }, [
    details.bathrooms,
    details.bedrooms,
    details.living_area_sq_ft,
    details.property_type,
    details.stories
  ]);

  return {
    showInvestorFields,
    requiredFixes,
    canContinue: requiredFixes.length === 0
  };
};
