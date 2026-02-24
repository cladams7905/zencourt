import { act, renderHook, waitFor } from "@testing-library/react";

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();
const mockFetchVideoStatus = jest.fn();
const mockCancelVideoGeneration = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args)
  }
}));

jest.mock("@web/src/lib/domain/listing/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) => mockEmitListingSidebarUpdate(...args)
}));

jest.mock("@web/src/components/listings/processing/domain/transport", () => ({
  fetchVideoStatus: (...args: unknown[]) => mockFetchVideoStatus(...args),
  cancelVideoGeneration: (...args: unknown[]) => mockCancelVideoGeneration(...args),
  startListingContentGeneration: jest.fn().mockResolvedValue(undefined),
  startVideoGeneration: jest.fn().mockResolvedValue(undefined)
}));

import { useGenerateProcessingFlow } from "@web/src/components/listings/processing/domain/useGenerateProcessingFlow";

describe("useGenerateProcessingFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchVideoStatus.mockResolvedValue({ jobs: [] });
  });

  it("cancels generation and navigates to review", async () => {
    const navigate = jest.fn();
    const updateStage = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useGenerateProcessingFlow({
        mode: "generate",
        listingId: "l1",
        navigate,
        updateStage,
        goToStage: jest.fn().mockResolvedValue(undefined)
      })
    );

    await waitFor(() => {
      expect(result.current.isGenerateMode).toBe(true);
    });

    await act(async () => {
      await result.current.handleCancelGeneration();
    });

    expect(mockCancelVideoGeneration).toHaveBeenCalledWith("l1");
    expect(updateStage).toHaveBeenCalledWith("review");
    expect(navigate).toHaveBeenCalledWith("/listings/l1/review");
  });
});
