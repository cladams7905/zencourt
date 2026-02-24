import { act, renderHook, waitFor } from "@testing-library/react";

const mockToastError = jest.fn();
const mockFetchPropertyDetails = jest.fn();

jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) }
}));

jest.mock("@web/src/components/listings/processing/domain/transport", () => ({
  fetchPropertyDetails: (...args: unknown[]) => mockFetchPropertyDetails(...args)
}));

import { useReviewProcessingFlow } from "@web/src/components/listings/processing/domain/useReviewProcessingFlow";

describe("useReviewProcessingFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("sets error state when fetch fails", async () => {
    mockFetchPropertyDetails.mockRejectedValue(new Error("IDX down"));

    const { result } = renderHook(() =>
      useReviewProcessingFlow({
        mode: "review",
        listingId: "l1",
        address: "123 Main",
        navigate: jest.fn(),
        updateStage: jest.fn()
      })
    );

    await waitFor(() => {
      expect(result.current.status).toBe("error");
      expect(result.current.errorMessage).toBe("IDX down");
    });
  });

  it("handles skip by updating stage and navigating", async () => {
    const navigate = jest.fn();
    const updateStage = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useReviewProcessingFlow({
        mode: "review",
        listingId: "l1",
        navigate,
        updateStage
      })
    );

    await act(async () => {
      await result.current.handleSkip();
    });

    expect(updateStage).toHaveBeenCalledWith("review");
    expect(navigate).toHaveBeenCalledWith("/listings/l1/review");
  });
});
