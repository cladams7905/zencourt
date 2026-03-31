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

jest.mock("@web/src/components/listings/stage/processing/domain/transport", () => ({
  fetchVideoStatus: (...args: unknown[]) => mockFetchVideoStatus(...args),
  cancelVideoGeneration: (...args: unknown[]) =>
    mockCancelVideoGeneration(...args),
  startListingContentGeneration: (...args: unknown[]) =>
    mockStartListingContentGeneration(...args),
  startVideoGeneration: (...args: unknown[]) =>
    mockStartVideoGeneration(...args)
}));

import { useGenerateProcessingFlow } from "@web/src/components/listings/stage/processing/domain/hooks/useGenerateProcessingFlow";

describe("useGenerateProcessingFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartListingContentGeneration.mockResolvedValue(undefined);
    mockStartVideoGeneration.mockResolvedValue({
      batchId: "batch-1",
      jobCount: 1
    });
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
    expect(navigate).toHaveBeenCalledWith("/listings/l1/stage/review");
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

  it("estimates seven minutes for the full generation batch", async () => {
    const navigate = jest.fn();
    const updateStage = jest.fn().mockResolvedValue(undefined);
    const goToStage = jest.fn().mockResolvedValue(undefined);

    const { result } = renderHook(() =>
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
      expect(result.current.formattedEstimate).toBe("7:00");
    });
  });

  it("keeps the estimate at seven minutes even when multiple jobs are in the batch", async () => {
    const navigate = jest.fn();
    const updateStage = jest.fn().mockResolvedValue(undefined);
    const goToStage = jest.fn().mockResolvedValue(undefined);

    mockFetchVideoStatus.mockResolvedValue({
      batchId: "batch-1",
      status: "processing",
      createdAt: "2026-03-20T10:00:00.000Z",
      totalJobs: 5,
      completedJobs: 0,
      failedJobs: 0,
      canceledJobs: 0,
      processingJobs: 5,
      pendingJobs: 0,
      isTerminal: false,
      allSucceeded: false
    });

    const { result } = renderHook(() =>
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
      expect(result.current.formattedEstimate).toBe("7:00");
    });
  });

  it("does not start listing content generation before videos finish", async () => {
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
      expect(mockFetchVideoStatus).toHaveBeenCalledWith("batch-1");
    });

    expect(mockStartListingContentGeneration).not.toHaveBeenCalled();
  });

  it("does not leave the processing page when some jobs have failed but the batch is still running", async () => {
    const navigate = jest.fn();
    const updateStage = jest.fn().mockResolvedValue(undefined);
    const goToStage = jest.fn().mockResolvedValue(undefined);

    mockFetchVideoStatus.mockResolvedValue({
      batchId: "batch-1",
      status: "processing",
      createdAt: "2026-03-20T10:00:00.000Z",
      totalJobs: 3,
      completedJobs: 0,
      failedJobs: 1,
      canceledJobs: 0,
      processingJobs: 2,
      pendingJobs: 0,
      isTerminal: false,
      allSucceeded: false
    });

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
      expect(mockFetchVideoStatus).toHaveBeenCalledWith("batch-1");
    });

    expect(goToStage).not.toHaveBeenCalledWith(
      "review",
      "/listings/l1/stage/review"
    );
  });

  it("starts listing content generation after video generation succeeds", async () => {
    const navigate = jest.fn();
    const updateStage = jest.fn().mockResolvedValue(undefined);
    const goToStage = jest.fn().mockResolvedValue(undefined);

    mockFetchVideoStatus.mockResolvedValue({
      batchId: "batch-1",
      status: "completed",
      createdAt: "2026-03-20T10:00:00.000Z",
      totalJobs: 1,
      completedJobs: 1,
      failedJobs: 0,
      canceledJobs: 0,
      processingJobs: 0,
      pendingJobs: 0,
      isTerminal: true,
      allSucceeded: true
    });

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
      expect(mockStartListingContentGeneration).toHaveBeenCalledWith("l1");
    });
  });
});
