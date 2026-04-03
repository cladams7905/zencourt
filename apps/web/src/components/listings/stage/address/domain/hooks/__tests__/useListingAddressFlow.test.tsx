import { act, renderHook } from "@testing-library/react";
import { useListingAddressFlow } from "@web/src/components/listings/stage/address/domain/hooks/useListingAddressFlow";

const mockPush = jest.fn();
const mockCreateListingForCurrentUser = jest.fn();
const mockUpdateListingForCurrentUser = jest.fn();
const mockTouchListingActivityForCurrentUser = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();
const mockToastError = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush })
}));

jest.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => mockToastError(...args) }
}));

jest.mock("@web/src/server/actions/listings/commands", () => ({
  createListingForCurrentUser: (...args: unknown[]) =>
    mockCreateListingForCurrentUser(...args),
  updateListingForCurrentUser: (...args: unknown[]) =>
    mockUpdateListingForCurrentUser(...args),
  touchListingActivityForCurrentUser: (...args: unknown[]) =>
    mockTouchListingActivityForCurrentUser(...args)
}));

jest.mock("@web/src/lib/domain/listings/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

describe("useListingAddressFlow", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTouchListingActivityForCurrentUser.mockResolvedValue({ touched: true });
  });

  it("starts with empty address and no continue or hint", () => {
    const { result } = renderHook(() => useListingAddressFlow());

    expect(result.current.address).toBe("");
    expect(result.current.canContinue).toBe(false);
    expect(result.current.showSelectionHint).toBe(false);
    expect(result.current.isSubmitting).toBe(false);
  });

  it("sets address on change and clears confirmed selection", () => {
    const { result } = renderHook(() => useListingAddressFlow());

    act(() => {
      result.current.handleAddressChange(" 123 Main St ");
    });

    expect(result.current.address).toBe(" 123 Main St ");
    expect(result.current.canContinue).toBe(false);
    expect(result.current.showSelectionHint).toBe(true);
  });

  it("allows continue after a confirmed address selection", () => {
    const { result } = renderHook(() => useListingAddressFlow());

    act(() => {
      result.current.handleAddressChange("123 Main");
    });
    act(() => {
      result.current.handleAddressSelect({
        formattedAddress: "123 Main St, Seattle, WA 98101",
        placeId: "place-1"
      });
    });

    expect(result.current.address).toBe("123 Main St, Seattle, WA 98101");
    expect(result.current.canContinue).toBe(true);
    expect(result.current.showSelectionHint).toBe(false);
  });

  it("does not confirm when selection has no formatted address", () => {
    const { result } = renderHook(() => useListingAddressFlow());

    act(() => {
      result.current.handleAddressChange("typed");
    });
    act(() => {
      result.current.handleAddressSelect({
        formattedAddress: "   ",
        placeId: "place-1"
      });
    });

    expect(result.current.canContinue).toBe(false);
    expect(result.current.showSelectionHint).toBe(true);
  });

  it("clears confirmation when the user edits the field after selecting", () => {
    const { result } = renderHook(() => useListingAddressFlow());

    act(() => {
      result.current.handleAddressSelect({
        formattedAddress: "123 Main St, Seattle, WA",
        placeId: "place-1"
      });
    });
    expect(result.current.canContinue).toBe(true);

    act(() => {
      result.current.handleAddressChange("123 Main St, Seattle, WA!");
    });

    expect(result.current.canContinue).toBe(false);
    expect(result.current.showSelectionHint).toBe(true);
  });

  it("does not submit when address is empty or unconfirmed", async () => {
    const { result } = renderHook(() => useListingAddressFlow());

    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockCreateListingForCurrentUser).not.toHaveBeenCalled();

    act(() => {
      result.current.handleAddressChange("only typed");
    });
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockCreateListingForCurrentUser).not.toHaveBeenCalled();
  });

  it("updates existing listing when prefilled, without creating a draft", async () => {
    mockUpdateListingForCurrentUser.mockResolvedValue({
      id: "listing-existing",
      listingStage: "plan"
    });

    const { result } = renderHook(() =>
      useListingAddressFlow({
        prefilledListingId: "listing-existing",
        initialAddressFromListing: "100 Pine St, Austin, TX"
      })
    );

    expect(result.current.canContinue).toBe(true);

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(mockCreateListingForCurrentUser).not.toHaveBeenCalled();
    expect(mockUpdateListingForCurrentUser).toHaveBeenCalledWith(
      "listing-existing",
      {
        title: "100 Pine St",
        address: "100 Pine St, Austin, TX"
      }
    );
    expect(mockTouchListingActivityForCurrentUser).toHaveBeenCalledWith(
      "listing-existing"
    );
    expect(mockEmitListingSidebarUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "listing-existing",
        title: "100 Pine St",
        listingStage: "plan"
      })
    );
    expect(mockPush).toHaveBeenCalledWith(
      "/listings/listing-existing/stage/upload"
    );
  });

  it("creates draft, updates listing, emits sidebar, and navigates on success", async () => {
    mockCreateListingForCurrentUser.mockResolvedValue({
      id: "listing-1",
      listingStage: "upload"
    });
    mockUpdateListingForCurrentUser.mockResolvedValue({
      id: "listing-1",
      listingStage: "upload"
    });

    const { result } = renderHook(() => useListingAddressFlow());

    act(() => {
      result.current.handleAddressSelect({
        formattedAddress: "456 Oak Ave, Portland, OR",
        placeId: "place-2"
      });
    });

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(mockCreateListingForCurrentUser).toHaveBeenCalledTimes(1);
    expect(mockUpdateListingForCurrentUser).toHaveBeenCalledWith("listing-1", {
      title: "456 Oak Ave",
      address: "456 Oak Ave, Portland, OR",
      listingStage: "upload"
    });
    expect(mockTouchListingActivityForCurrentUser).toHaveBeenCalledWith(
      "listing-1"
    );
    expect(mockEmitListingSidebarUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "listing-1",
        title: "456 Oak Ave",
        listingStage: "upload"
      })
    );
    expect(mockPush).toHaveBeenCalledWith("/listings/listing-1/stage/upload");
    expect(result.current.isSubmitting).toBe(false);
  });

  it("shows toast and does not navigate when create returns no id", async () => {
    mockCreateListingForCurrentUser.mockResolvedValue({ id: null });

    const { result } = renderHook(() => useListingAddressFlow());

    act(() => {
      result.current.handleAddressSelect({
        formattedAddress: "1 Test Rd",
        placeId: "p"
      });
    });

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(mockToastError).toHaveBeenCalledWith(
      "Draft listing could not be created."
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(result.current.isSubmitting).toBe(false);
  });

  it("shows toast when update throws", async () => {
    mockCreateListingForCurrentUser.mockResolvedValue({
      id: "listing-1",
      listingStage: "upload"
    });
    mockUpdateListingForCurrentUser.mockRejectedValue(
      new Error("Network error")
    );

    const { result } = renderHook(() => useListingAddressFlow());

    act(() => {
      result.current.handleAddressSelect({
        formattedAddress: "1 Test Rd",
        placeId: "p"
      });
    });

    await act(async () => {
      await result.current.handleContinue();
    });

    expect(mockToastError).toHaveBeenCalledWith("Network error");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
