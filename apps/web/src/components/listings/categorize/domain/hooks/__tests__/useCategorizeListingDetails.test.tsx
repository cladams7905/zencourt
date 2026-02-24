import { act, renderHook, waitFor } from "@testing-library/react";
import { useCategorizeListingDetails } from "@web/src/components/listings/categorize/domain/hooks/useCategorizeListingDetails";

const mockPush = jest.fn();
const mockToastError = jest.fn();
const mockUpdateListing = jest.fn();
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

jest.mock("@web/src/server/models/listings", () => ({
  updateListing: (...args: unknown[]) => mockUpdateListing(...args)
}));

describe("useCategorizeListingDetails", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockToastError.mockReset();
    mockUpdateListing.mockReset();
    mockEmitListingSidebarUpdate.mockReset();
    mockUpdateListing.mockResolvedValue(undefined);
  });

  it("persists title changes and emits sidebar updates", async () => {
    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Old",
        initialAddress: "",
        hasPropertyDetails: true,
        listingId: "l1",
        userId: "u1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    await act(async () => {
      await result.current.persistListingTitle("New");
    });

    expect(mockUpdateListing).toHaveBeenCalledWith("u1", "l1", { title: "New" });
    expect(mockEmitListingSidebarUpdate).toHaveBeenCalled();
  });

  it("updates address and clears property details when address changes", async () => {
    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Listing",
        initialAddress: "123 Main St",
        hasPropertyDetails: true,
        listingId: "l1",
        userId: "u1",
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
        "u1",
        "l1",
        expect.objectContaining({
          address: "456 Pine St, Seattle, WA",
          propertyDetails: null
        })
      );
    });
  });

  it("continues to review route when property details already exist", async () => {
    const { result } = renderHook(() =>
      useCategorizeListingDetails({
        title: "Listing",
        initialAddress: "123 Main St",
        hasPropertyDetails: true,
        listingId: "l1",
        userId: "u1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    await act(async () => {
      await result.current.handleContinue();
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
        userId: "u1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn()
      })
    );

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(mockPush).toHaveBeenCalledWith("/listings/l1/review/processing");
  });
});
