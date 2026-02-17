import { act, renderHook } from "@testing-library/react";
import { useCategorizeMutations } from "@web/src/components/listings/categorize/domain/hooks/useCategorizeMutations";

const mockToastError = jest.fn();
const mockUpdateListingImageAssignments = jest.fn();
const mockAssignPrimary = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("@web/src/server/actions/db/listings", () => ({
  updateListingImageAssignments: (...args: unknown[]) =>
    mockUpdateListingImageAssignments(...args),
  assignPrimaryListingImageForCategory: (...args: unknown[]) =>
    mockAssignPrimary(...args)
}));

describe("useCategorizeMutations", () => {
  beforeEach(() => {
    mockToastError.mockReset();
    mockUpdateListingImageAssignments.mockReset();
    mockAssignPrimary.mockReset();
  });

  it("persists image assignments and returns true on success", async () => {
    mockUpdateListingImageAssignments.mockResolvedValue(undefined);
    const setImages = jest.fn();
    const { result } = renderHook(() =>
      useCategorizeMutations({
        userId: "u1",
        listingId: "l1",
        setImages
      })
    );

    let ok = false;
    await act(async () => {
      ok = await result.current.persistImageAssignments(
        [{ id: "img1", category: "kitchen", isPrimary: false }],
        []
      );
    });

    expect(ok).toBe(true);
    expect(mockUpdateListingImageAssignments).toHaveBeenCalledWith(
      "u1",
      "l1",
      [{ id: "img1", category: "kitchen", isPrimary: false }],
      []
    );
  });

  it("rolls back and toasts on assignment failure", async () => {
    mockUpdateListingImageAssignments.mockRejectedValue(new Error("nope"));
    const rollback = jest.fn();
    const { result } = renderHook(() =>
      useCategorizeMutations({
        userId: "u1",
        listingId: "l1",
        setImages: jest.fn()
      })
    );

    let ok = true;
    await act(async () => {
      ok = await result.current.persistImageAssignments([], [], rollback);
    });

    expect(ok).toBe(false);
    expect(rollback).toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalled();
  });

  it("assigns primary when category has no primary", async () => {
    mockAssignPrimary.mockResolvedValue({ primaryImageId: "img2" });
    const setImages = jest.fn();
    const { result } = renderHook(() =>
      useCategorizeMutations({
        userId: "u1",
        listingId: "l1",
        setImages
      })
    );

    await act(async () => {
      await result.current.ensurePrimaryForCategory("kitchen", [
        { id: "img1", url: "", filename: "a.jpg", category: "kitchen" },
        { id: "img2", url: "", filename: "b.jpg", category: "kitchen" }
      ]);
    });

    expect(mockAssignPrimary).toHaveBeenCalledWith("u1", "l1", "kitchen");
    expect(setImages).toHaveBeenCalledTimes(1);
  });

  it("does nothing when category already has primary", async () => {
    const { result } = renderHook(() =>
      useCategorizeMutations({
        userId: "u1",
        listingId: "l1",
        setImages: jest.fn()
      })
    );

    await act(async () => {
      await result.current.ensurePrimaryForCategory("kitchen", [
        {
          id: "img1",
          url: "",
          filename: "a.jpg",
          category: "kitchen",
          isPrimary: true
        }
      ]);
    });

    expect(mockAssignPrimary).not.toHaveBeenCalled();
  });
});
