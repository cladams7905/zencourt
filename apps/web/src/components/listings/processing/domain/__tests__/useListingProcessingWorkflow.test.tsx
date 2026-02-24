import { act, renderHook, waitFor } from "@testing-library/react";

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();
const mockFetchPropertyDetails = jest.fn();
const mockUpdateListingStage = jest.fn();
const mockFetchVideoStatus = jest.fn();
const mockFetchListingImages = jest.fn();
const mockTriggerCategorization = jest.fn();
const mockStartListingContentGeneration = jest.fn();
const mockStartVideoGeneration = jest.fn();
const mockCancelVideoGeneration = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args)
  }
}));

jest.mock("@web/src/lib/domain/listing/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

jest.mock("@web/src/components/listings/processing/domain/transport", () => ({
  fetchPropertyDetails: (...args: unknown[]) => mockFetchPropertyDetails(...args),
  updateListingStage: (...args: unknown[]) => mockUpdateListingStage(...args),
  fetchVideoStatus: (...args: unknown[]) => mockFetchVideoStatus(...args),
  fetchListingImages: (...args: unknown[]) => mockFetchListingImages(...args),
  triggerCategorization: (...args: unknown[]) => mockTriggerCategorization(...args),
  startListingContentGeneration: (...args: unknown[]) =>
    mockStartListingContentGeneration(...args),
  startVideoGeneration: (...args: unknown[]) => mockStartVideoGeneration(...args),
  cancelVideoGeneration: (...args: unknown[]) => mockCancelVideoGeneration(...args)
}));

import { useListingProcessingWorkflow } from "@web/src/components/listings/processing/domain/useListingProcessingWorkflow";

describe("useListingProcessingWorkflow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets review error state when property fetch fails", async () => {
    mockFetchPropertyDetails.mockRejectedValue(new Error("IDX unavailable"));

    const { result } = renderHook(() =>
      useListingProcessingWorkflow({
        mode: "review",
        listingId: "l1",
        address: "123 Main",
        navigate: jest.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toBe("IDX unavailable");
    });
  });

  it("cancels generation and navigates to review", async () => {
    const navigate = jest.fn();
    mockFetchVideoStatus.mockResolvedValue({ jobs: [] });

    const { result } = renderHook(() =>
      useListingProcessingWorkflow({
        mode: "generate",
        listingId: "l1",
        navigate
      })
    );

    await waitFor(() => {
      expect(result.current.isGenerateMode).toBe(true);
    });

    await act(async () => {
      await result.current.handleCancelGeneration();
    });

    expect(mockCancelVideoGeneration).toHaveBeenCalledWith("l1");
    expect(mockUpdateListingStage).toHaveBeenCalledWith("l1", "review");
    expect(navigate).toHaveBeenCalledWith("/listings/l1/review");
  });
});
