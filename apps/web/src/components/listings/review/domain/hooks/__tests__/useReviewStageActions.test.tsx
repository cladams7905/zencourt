import { act, renderHook, waitFor } from "@testing-library/react";
import { useReviewStageActions } from "@web/src/components/listings/review/domain/hooks/useReviewStageActions";

const mockFetchApiData = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();
const mockEmitListingSidebarHeartbeat = jest.fn();
const mockToastError = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
});

jest.mock("@web/src/lib/core/http/client", () => ({
  fetchApiData: (...args: unknown[]) => mockFetchApiData(...args)
}));

jest.mock("@web/src/lib/domain/listing/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args),
  emitListingSidebarHeartbeat: (...args: unknown[]) =>
    mockEmitListingSidebarHeartbeat(...args)
}));

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

describe("useReviewStageActions", () => {
  it("navigates to generate on confirm continue", async () => {
    const navigate = jest.fn();
    const handleSave = jest.fn().mockResolvedValue(undefined);
    mockFetchApiData.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        navigate,
        handleSave
      })
    );

    await act(async () => {
      await result.current.handleConfirmContinue();
    });

    expect(handleSave).toHaveBeenCalledWith({ silent: true });
    expect(mockFetchApiData).toHaveBeenCalledWith(
      "/api/v1/listings/listing-1/stage",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ listingStage: "generate" })
      })
    );
    expect(navigate).toHaveBeenCalledWith("/listings/listing-1/generate");
  });

  it("handles go back failure and resets loading state", async () => {
    const navigate = jest.fn();
    mockFetchApiData.mockRejectedValue(new Error("failed"));

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        navigate,
        handleSave: jest.fn()
      })
    );

    await act(async () => {
      await result.current.handleGoBack();
    });

    expect(mockToastError).toHaveBeenCalledWith("failed");
    expect(result.current.isGoingBack).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("emits sidebar heartbeat on mount", async () => {
    renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        navigate: jest.fn(),
        handleSave: jest.fn()
      })
    );

    await waitFor(() => {
      expect(mockEmitListingSidebarHeartbeat).toHaveBeenCalledWith(
        expect.objectContaining({ id: "listing-1" })
      );
    });
  });

  it("shows error when continue transition fails", async () => {
    const navigate = jest.fn();
    const handleSave = jest.fn().mockResolvedValue(undefined);
    mockFetchApiData.mockRejectedValue(new Error("continue failed"));

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        navigate,
        handleSave
      })
    );

    await act(async () => {
      await result.current.handleConfirmContinue();
    });

    expect(mockToastError).toHaveBeenCalledWith("continue failed");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates to categorize on go back success", async () => {
    const navigate = jest.fn();
    mockFetchApiData.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        navigate,
        handleSave: jest.fn()
      })
    );

    await act(async () => {
      await result.current.handleGoBack();
    });

    expect(mockFetchApiData).toHaveBeenCalledWith(
      "/api/v1/listings/listing-1/stage",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ listingStage: "categorize" })
      })
    );
    expect(navigate).toHaveBeenCalledWith("/listings/listing-1/categorize");
  });

  it("prevents duplicate go back transitions while in flight", async () => {
    const navigate = jest.fn();
    let resolveUpdate: (() => void) | null = null;
    mockFetchApiData.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveUpdate = resolve;
        })
    );

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        navigate,
        handleSave: jest.fn()
      })
    );

    await act(async () => {
      const first = result.current.handleGoBack();
      const second = result.current.handleGoBack();
      await Promise.resolve();
      resolveUpdate?.();
      await Promise.all([first, second]);
    });

    expect(mockFetchApiData).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it("uses fallback error message for non-Error throws", async () => {
    const navigate = jest.fn();
    const handleSave = jest.fn().mockRejectedValue("boom");

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        navigate,
        handleSave
      })
    );

    await act(async () => {
      await result.current.handleConfirmContinue();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Failed to continue to generation."
    );

    mockToastError.mockReset();
    mockFetchApiData.mockRejectedValue("boom");

    await act(async () => {
      await result.current.handleGoBack();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Failed to return to categorize stage."
    );
  });
});
