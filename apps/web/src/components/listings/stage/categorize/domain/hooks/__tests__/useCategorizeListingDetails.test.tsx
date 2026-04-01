import { act, renderHook, waitFor } from "@testing-library/react";
import { useCategorizeListingDetails } from "@web/src/components/listings/stage/categorize/domain/hooks/useCategorizeListingDetails";

const mockPush = jest.fn();
const mockToastError = jest.fn();
const mockUpdateListing = jest.fn();
const mockTouchListingActivity = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush
  })
}));

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("@web/src/lib/domain/listings/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

jest.mock("@web/src/server/actions/listings/commands", () => ({
  updateListingForCurrentUser: (...args: unknown[]) =>
    mockUpdateListing(...args),
  touchListingActivityForCurrentUser: (...args: unknown[]) =>
    mockTouchListingActivity(...args)
}));

describe("useCategorizeListingDetails", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockToastError.mockReset();
    mockUpdateListing.mockReset();
    mockTouchListingActivity.mockReset();
    mockEmitListingSidebarUpdate.mockReset();
    mockUpdateListing.mockResolvedValue(undefined);
    mockTouchListingActivity.mockResolvedValue({ touched: true });
  });

  it("persists title changes and emits sidebar updates", async () => {
    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Old",
        initialAddress: "",
        hasPropertyDetails: true,
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    await act(async () => {
      await result.current.persistListingTitle("New");
    });

    expect(mockUpdateListing).toHaveBeenCalledWith("l1", { title: "New" });
    expect(mockEmitListingSidebarUpdate).toHaveBeenCalled();
  });

  it("rolls back title changes and toasts when title persistence fails", async () => {
    mockUpdateListing.mockRejectedValueOnce(new Error("save failed"));

    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Old",
        initialAddress: "",
        hasPropertyDetails: true,
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    await act(async () => {
      await result.current.persistListingTitle("New");
    });

    expect(result.current.draftTitle).toBe("Old");
    expect(mockToastError).toHaveBeenCalledWith("save failed");
  });

  it("updates address and clears property details when address changes", async () => {
    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Listing",
        initialAddress: "123 Main St",
        hasPropertyDetails: true,
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    act(() => {
      result.current.handleAddressSelect({
        formattedAddress: "456 Pine St, Seattle, WA"
      });
    });

    await waitFor(() => {
      expect(mockUpdateListing).toHaveBeenCalledWith(
        "l1",
        expect.objectContaining({
          title: "456 Pine St",
          address: "456 Pine St, Seattle, WA",
          propertyDetails: null
        })
      );
    });

    expect(mockUpdateListing).toHaveBeenCalledTimes(1);
  });

  it("ignores empty address selections", () => {
    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Listing",
        initialAddress: "123 Main St",
        hasPropertyDetails: true,
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    act(() => {
      result.current.handleAddressSelect({});
    });

    expect(mockUpdateListing).not.toHaveBeenCalled();
  });

  it("continues to review route when property details already exist", async () => {
    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Listing",
        initialAddress: "123 Main St",
        hasPropertyDetails: true,
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(mockUpdateListing).toHaveBeenCalledTimes(1);
    expect(mockUpdateListing).toHaveBeenCalledWith("l1", {
      listingStage: "review"
    });
    expect(mockPush).toHaveBeenCalledWith("/listings/l1/stage/review");
  });

  it("continues to review route when property details are missing", async () => {
    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Listing",
        initialAddress: "",
        hasPropertyDetails: false,
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(mockPush).toHaveBeenCalledWith("/listings/l1/stage/review");
  });

  it("stops continuation when address persistence fails", async () => {
    mockUpdateListing.mockRejectedValueOnce(new Error("address failed"));

    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Listing",
        initialAddress: "",
        hasPropertyDetails: false,
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    act(() => {
      result.current.setAddressValue("456 Pine St");
    });

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(mockToastError).toHaveBeenCalledWith("address failed");
    expect(mockPush).not.toHaveBeenCalled();
    expect(mockUpdateListing).toHaveBeenCalledTimes(1);
  });

  it("toasts and does not navigate when the stage update fails", async () => {
    mockUpdateListing.mockRejectedValueOnce(new Error("stage failed"));

    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Listing",
        initialAddress: "",
        hasPropertyDetails: false,
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(mockToastError).toHaveBeenCalledWith("stage failed");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
