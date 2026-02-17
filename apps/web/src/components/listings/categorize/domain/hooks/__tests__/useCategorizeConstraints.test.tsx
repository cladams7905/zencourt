import { renderHook, waitFor } from "@testing-library/react";
import { useCategorizeConstraints } from "@web/src/components/listings/categorize/domain/hooks/useCategorizeConstraints";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/categorize/shared";

const mockToastError = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

describe("useCategorizeConstraints", () => {
  beforeEach(() => {
    mockToastError.mockReset();
  });

  it("moves overflow images out of categories and persists assignments", async () => {
    const setImages = jest.fn();
    const persistImageAssignments = jest.fn().mockResolvedValue(true);
    renderHook(() =>
      useCategorizeConstraints({
        images: [
          { id: "a", url: "", filename: "a.jpg", category: "kitchen", primaryScore: 10 },
          { id: "b", url: "", filename: "b.jpg", category: "kitchen", primaryScore: 9 },
          { id: "c", url: "", filename: "c.jpg", category: "kitchen", primaryScore: 8 },
          { id: "d", url: "", filename: "d.jpg", category: "kitchen", primaryScore: 1 }
        ],
        categoryOrder: [UNCATEGORIZED_CATEGORY_ID, "kitchen"],
        baseCategoryCounts: { kitchen: 1 },
        setImages,
        persistImageAssignments
      })
    );

    await waitFor(() => {
      expect(setImages).toHaveBeenCalled();
      expect(persistImageAssignments).toHaveBeenCalled();
    });
  });

  it("toasts when max category limit is exceeded", async () => {
    const setImages = jest.fn();
    const persistImageAssignments = jest.fn().mockResolvedValue(true);
    const categoryOrder = [
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
    ];

    renderHook(() =>
      useCategorizeConstraints({
        images: [
          { id: "x", url: "", filename: "x.jpg", category: "c11", primaryScore: 1 }
        ],
        categoryOrder,
        baseCategoryCounts: {},
        setImages,
        persistImageAssignments
      })
    );

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith(
        expect.stringContaining("maximum of 10 categories")
      );
    });
  });
});
