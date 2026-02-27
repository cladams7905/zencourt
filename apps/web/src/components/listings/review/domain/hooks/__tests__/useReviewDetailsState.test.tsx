import { act, renderHook } from "@testing-library/react";
import type { ListingPropertyDetails } from "@shared/types/models";
import { useReviewDetailsState } from "@web/src/components/listings/review/domain/hooks/useReviewDetailsState";

describe("useReviewDetailsState", () => {
  it("initializes address fallback and custom modes", () => {
    const { result } = renderHook(() =>
      useReviewDetailsState({
        propertyDetails: {
          property_type: "Castle",
          architecture: "Neo-Revival"
        } as ListingPropertyDetails,
        address: "123 Main St"
      })
    );

    expect(result.current.details.address).toBe("123 Main St");
    expect(result.current.propertyTypeMode).toBe("custom");
    expect(result.current.architectureMode).toBe("custom");
  });

  it("marks dirty and updates refs when updateDetails is called", () => {
    const { result } = renderHook(() =>
      useReviewDetailsState({
        propertyDetails: null,
        address: "123 Main St"
      })
    );

    act(() => {
      result.current.updateDetails((prev) => ({
        ...prev,
        bedrooms: 3
      }));
    });

    expect(result.current.dirtyRef.current).toBe(true);
    expect(result.current.detailsRef.current.bedrooms).toBe(3);
    expect(result.current.details.bedrooms).toBe(3);
  });

  it("normalizes list sections to null when empty", () => {
    const { result } = renderHook(() =>
      useReviewDetailsState({
        propertyDetails: {
          open_house_events: [{ date: "2026-03-01" }],
          sale_history: [{ event: "Sold" }]
        } as ListingPropertyDetails,
        address: null
      })
    );

    act(() => {
      result.current.setOpenHouseEvents([]);
      result.current.setSaleHistory([]);
      result.current.setValuationExamples([]);
    });

    expect(result.current.details.open_house_events).toBeNull();
    expect(result.current.details.sale_history).toBeNull();
    expect(result.current.details.valuation_estimates?.third_party_examples).toBeNull();
  });

  it("uses custom mode for custom street and lot types", () => {
    const { result } = renderHook(() =>
      useReviewDetailsState({
        propertyDetails: {
          location_context: {
            street_type: "Pedestrian lane",
            lot_type: "Ridge top"
          }
        } as ListingPropertyDetails,
        address: null
      })
    );

    expect(result.current.streetTypeMode).toBe("custom");
    expect(result.current.lotTypeMode).toBe("custom");
  });
});
