import { act, renderHook, waitFor } from "@testing-library/react";
import { useReviewStageActions } from "@web/src/components/listings/review/domain/hooks/useReviewStageActions";

const mockUpdateListing = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();
const mockToastError = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
});

jest.mock("@web/src/server/actions/db/listings", () => ({
  updateListing: (...args: unknown[]) => mockUpdateListing(...args)
}));

jest.mock("@web/src/lib/domain/listing/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
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
    mockUpdateListing.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        userId: "user-1",
        navigate,
        handleSave
      })
    );

    await act(async () => {
      await result.current.handleConfirmContinue();
    });

    expect(handleSave).toHaveBeenCalledWith({ silent: true });
    expect(mockUpdateListing).toHaveBeenCalledWith("user-1", "listing-1", {
      listingStage: "generate"
    });
    expect(navigate).toHaveBeenCalledWith("/listings/listing-1/generate");
  });

  it("handles go back failure and resets loading state", async () => {
    const navigate = jest.fn();
    mockUpdateListing.mockRejectedValue(new Error("failed"));

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        userId: "user-1",
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
        userId: "user-1",
        navigate: jest.fn(),
        handleSave: jest.fn()
      })
    );

    await waitFor(() => {
      expect(mockEmitListingSidebarUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ id: "listing-1" })
      );
    });
  });

  it("shows error when continue transition fails", async () => {
    const navigate = jest.fn();
    const handleSave = jest.fn().mockResolvedValue(undefined);
    mockUpdateListing.mockRejectedValue(new Error("continue failed"));

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        userId: "user-1",
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
    mockUpdateListing.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        userId: "user-1",
        navigate,
        handleSave: jest.fn()
      })
    );

    await act(async () => {
      await result.current.handleGoBack();
    });

    expect(mockUpdateListing).toHaveBeenCalledWith("user-1", "listing-1", {
      listingStage: "categorize"
    });
    expect(navigate).toHaveBeenCalledWith("/listings/listing-1/categorize");
  });

  it("uses fallback error message for non-Error throws", async () => {
    const navigate = jest.fn();
    const handleSave = jest.fn().mockRejectedValue("boom");

    const { result } = renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        userId: "user-1",
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
    mockUpdateListing.mockRejectedValue("boom");

    await act(async () => {
      await result.current.handleGoBack();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Failed to return to categorize stage."
    );
  });
});
