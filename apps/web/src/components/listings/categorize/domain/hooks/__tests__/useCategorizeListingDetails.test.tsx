import { act, renderHook, waitFor } from "@testing-library/react";
import { useCategorizeListingDetails } from "@web/src/components/listings/categorize/domain/hooks/useCategorizeListingDetails";

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

jest.mock("@web/src/lib/domain/listing/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

jest.mock("@web/src/server/actions/listings/commands", () => ({
  updateListingForCurrentUser: (...args: unknown[]) => mockUpdateListing(...args),
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
    expect(mockPush).toHaveBeenCalledWith("/listings/l1/review");
  });

  it("continues to processing route when property details are missing", async () => {
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

    expect(mockPush).toHaveBeenCalledWith("/listings/l1/review/processing");
  });
});
