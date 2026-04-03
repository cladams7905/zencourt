import { act, renderHook } from "@testing-library/react";
import { useReviewStageActions } from "@web/src/components/listings/stage/review/domain/hooks/useReviewStageActions";

const mockFetchApiData = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();
const mockToastError = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
});

jest.mock("@web/src/lib/core/http/client", () => ({
  fetchApiData: (...args: unknown[]) => mockFetchApiData(...args)
}));

jest.mock("@web/src/lib/domain/listings/sidebarEvents", () => ({
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
    expect(navigate).toHaveBeenCalledWith("/listings/listing-1/stage/generate");
  });

  it("navigates back without attempting to update the listing stage", async () => {
    const navigate = jest.fn();

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

    expect(mockFetchApiData).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      "/listings/listing-1/stage/plan"
    );
  });

  it("does not emit sidebar events on mount", () => {
    renderHook(() =>
      useReviewStageActions({
        listingId: "listing-1",
        navigate: jest.fn(),
        handleSave: jest.fn()
      })
    );

    expect(mockEmitListingSidebarUpdate).not.toHaveBeenCalled();
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

  it("navigates to plan on go back success without downgrading stage", async () => {
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

    expect(mockFetchApiData).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(
      "/listings/listing-1/stage/plan"
    );
  });

  it("prevents duplicate go back transitions while in flight", async () => {
    const navigate = jest.fn();
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
      await Promise.all([first, second]);
    });

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
    await act(async () => {
      await result.current.handleGoBack();
    });

    expect(mockToastError).not.toHaveBeenCalled();
  });
});
