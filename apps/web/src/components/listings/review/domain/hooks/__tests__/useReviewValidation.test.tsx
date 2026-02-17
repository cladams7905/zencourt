import { renderHook } from "@testing-library/react";
import type { ListingPropertyDetails } from "@shared/types/models";
import { useReviewValidation } from "@web/src/components/listings/review/domain/hooks/useReviewValidation";

describe("useReviewValidation", () => {
  it("returns all required fixes when critical fields are missing", () => {
    const { result } = renderHook(() =>
      useReviewValidation({
        details: {} as ListingPropertyDetails,
        targetAudiences: null
      })
    );

    expect(result.current.requiredFixes).toEqual([
      "Property type is missing.",
      "Living area is missing.",
      "Bedrooms count is missing.",
      "Bathrooms count is missing.",
      "Stories count is missing."
    ]);
    expect(result.current.canContinue).toBe(false);
  });

  it("enables continue when required fields are present", () => {
    const { result } = renderHook(() =>
      useReviewValidation({
        details: {
          property_type: "Condo",
          living_area_sq_ft: 1200,
          bedrooms: 2,
          bathrooms: 2,
          stories: 1
        } as ListingPropertyDetails,
        targetAudiences: null
      })
    );

    expect(result.current.requiredFixes).toEqual([]);
    expect(result.current.canContinue).toBe(true);
  });

  it("shows investor fields for investor-related audience", () => {
    const { result } = renderHook(() =>
      useReviewValidation({
        details: {} as ListingPropertyDetails,
        targetAudiences: ["real_estate_investors"]
      })
    );

    expect(result.current.showInvestorFields).toBe(true);
  });
});
