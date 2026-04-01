import { act, renderHook } from "@testing-library/react";
import { useCategorizeMutations } from "@web/src/components/listings/stage/categorize/domain/hooks/useCategorizeMutations";

const mockToastError = jest.fn();
const mockUpdateListingImageAssignments = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("@web/src/server/actions/listings/image", () => ({
  updateListingImageAssignmentsForCurrentUser: (...args: unknown[]) =>
    mockUpdateListingImageAssignments(...args)
}));

describe("useCategorizeMutations", () => {
  beforeEach(() => {
    mockToastError.mockReset();
    mockUpdateListingImageAssignments.mockReset();
  });

  it("persists image assignments and returns true on success", async () => {
    mockUpdateListingImageAssignments.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useCategorizeMutations({
        listingId: "l1"
      })
    );

    let ok = false;
    await act(async () => {
      ok = await result.current.persistImageAssignments(
        [{ id: "img1", category: "kitchen" }],
        []
      );
    });

    expect(ok).toBe(true);
    expect(mockUpdateListingImageAssignments).toHaveBeenCalledWith(
      "l1",
      [{ id: "img1", category: "kitchen" }],
      []
    );
  });

  it("rolls back and toasts on assignment failure", async () => {
    mockUpdateListingImageAssignments.mockRejectedValue(new Error("nope"));
    const rollback = jest.fn();
    const { result } = renderHook(() =>
      useCategorizeMutations({
        listingId: "l1"
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
});
