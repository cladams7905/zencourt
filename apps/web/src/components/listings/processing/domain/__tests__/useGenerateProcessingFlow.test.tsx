import { act, renderHook, waitFor } from "@testing-library/react";

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();
const mockFetchVideoStatus = jest.fn();
const mockCancelVideoGeneration = jest.fn();
const mockStartListingContentGeneration = jest.fn();
const mockStartVideoGeneration = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args)
  }
}));

jest.mock("@web/src/lib/domain/listings/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

jest.mock("@web/src/components/listings/processing/domain/transport", () => ({
  fetchVideoStatus: (...args: unknown[]) => mockFetchVideoStatus(...args),
  cancelVideoGeneration: (...args: unknown[]) =>
    mockCancelVideoGeneration(...args),
  startListingContentGeneration: (...args: unknown[]) =>
    mockStartListingContentGeneration(...args),
  startVideoGeneration: (...args: unknown[]) =>
    mockStartVideoGeneration(...args)
}));

import { useGenerateProcessingFlow } from "@web/src/components/listings/processing/domain/useGenerateProcessingFlow";

describe("useGenerateProcessingFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartListingContentGeneration.mockResolvedValue(undefined);
    mockStartVideoGeneration.mockResolvedValue(undefined);
    mockFetchVideoStatus.mockResolvedValue({
      batchId: "batch-1",
      status: "processing",
      createdAt: "2026-03-20T10:00:00.000Z",
      totalJobs: 1,
      completedJobs: 0,
      failedJobs: 0,
      canceledJobs: 0,
      processingJobs: 1,
      pendingJobs: 0,
      isTerminal: false,
      allSucceeded: false
    });
  });

  it("cancels generation and navigates to review", async () => {
    const navigate = jest.fn();
    const updateStage = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useGenerateProcessingFlow({
        mode: "generate",
        listingId: "l1",
        initialBatchId: "batch-1",
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

    expect(mockCancelVideoGeneration).toHaveBeenCalledWith("batch-1");
    expect(updateStage).toHaveBeenCalledWith("review");
    expect(navigate).toHaveBeenCalledWith("/listings/l1/review");
  });

  it("keeps polling and shows a delayed-generation toast when batch generation exceeds the soft timeout", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-20T10:16:00.000Z"));

    const navigate = jest.fn();
    const updateStage = jest.fn().mockResolvedValue(undefined);
    const goToStage = jest.fn().mockResolvedValue(undefined);

    renderHook(() =>
      useGenerateProcessingFlow({
        mode: "generate",
        listingId: "l1",
        initialBatchId: "batch-1",
        navigate,
        updateStage,
        goToStage
      })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        "Generation is taking longer than usual because the queue is busy. We'll keep trying."
      );
    });

    jest.useRealTimers();
  });
});
