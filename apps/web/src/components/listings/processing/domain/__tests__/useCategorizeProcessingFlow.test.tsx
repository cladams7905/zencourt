import { renderHook, waitFor } from "@testing-library/react";

const mockEmitListingSidebarUpdate = jest.fn();
const mockFetchListingImages = jest.fn();
const mockTriggerCategorization = jest.fn();

jest.mock("@web/src/lib/domain/listing/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) => mockEmitListingSidebarUpdate(...args)
}));

jest.mock("@web/src/components/listings/processing/domain/transport", () => ({
  fetchListingImages: (...args: unknown[]) => mockFetchListingImages(...args),
  triggerCategorization: (...args: unknown[]) => mockTriggerCategorization(...args)
}));

import { useCategorizeProcessingFlow } from "@web/src/components/listings/processing/domain/useCategorizeProcessingFlow";

describe("useCategorizeProcessingFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("navigates when all images are categorized", async () => {
    mockFetchListingImages.mockResolvedValue([
      {
        id: "img1",
        category: "kitchen",
        confidence: 0.9,
        primaryScore: 0.8,
        uploadedAt: new Date().toISOString()
      }
    ]);
    mockTriggerCategorization.mockResolvedValue(undefined);
    const navigate = jest.fn();

    renderHook(() =>
      useCategorizeProcessingFlow({
        mode: "categorize",
        listingId: "l1",
        navigate
      })
    );

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith("/listings/l1/categorize");
    });
    expect(mockEmitListingSidebarUpdate).toHaveBeenCalled();
  });
});
