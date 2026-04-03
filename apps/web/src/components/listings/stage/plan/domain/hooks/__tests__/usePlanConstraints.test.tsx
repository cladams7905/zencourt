import { renderHook, waitFor } from "@testing-library/react";
import { usePlanConstraints } from "@web/src/components/listings/stage/plan/domain/hooks/usePlanConstraints";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/stage/plan/shared";

const mockToastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

describe("usePlanConstraints", () => {
  beforeEach(() => {
    mockToastError.mockReset();
  });

  it("toasts when max category limit is exceeded", async () => {
    renderHook(() =>
      usePlanConstraints({
        categoryOrder: [
          UNCATEGORIZED_CATEGORY_ID,
          "c1",
          "c2",
          "c3",
          "c4",
          "c5",
          "c6",
          "c7",
          "c8",
          "c9",
          "c10",
          "c11"
        ]
      })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("maximum of 10 categories")
      );
    });
  });

  it("does not toast when category count is within the limit", async () => {
    renderHook(() =>
      usePlanConstraints({
        categoryOrder: [UNCATEGORIZED_CATEGORY_ID, "c1", "c2"]
      })
    );

    await waitFor(() => {
      expect(mockToastError).not.toHaveBeenCalled();
    });
  });
});
