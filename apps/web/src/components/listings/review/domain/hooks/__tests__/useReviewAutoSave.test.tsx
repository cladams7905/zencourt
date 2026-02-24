import { act, renderHook, waitFor } from "@testing-library/react";
import type { ListingPropertyDetails } from "@shared/types/models";
import { useReviewAutoSave } from "@web/src/components/listings/review/domain/hooks/useReviewAutoSave";

const mockSaveListingPropertyDetails = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockToastMessage = jest.fn();

jest.mock("@web/src/server/actions/api/propertyDetails", () => ({
  saveListingPropertyDetails: (...args: unknown[]) =>
    mockSaveListingPropertyDetails(...args)
}));

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    message: (...args: unknown[]) => mockToastMessage(...args)
  }
}));

describe("useReviewAutoSave", () => {
  beforeEach(() => {
    mockSaveListingPropertyDetails.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockToastMessage.mockReset();
  });

  it("saves successfully and clears dirty state", async () => {
    const detailsRef = {
      current: { bathrooms: 2 } as ListingPropertyDetails
    };
    const dirtyRef = { current: true };
    const updateDetails = jest.fn();

    mockSaveListingPropertyDetails.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReviewAutoSave({
        userId: "user-1",
        listingId: "listing-1",
        detailsRef,
        dirtyRef,
        updateDetails
      })
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockSaveListingPropertyDetails).toHaveBeenCalledWith(
      "user-1",
      "listing-1",
      detailsRef.current
    );
    expect(dirtyRef.current).toBe(false);
    expect(mockToastSuccess).toHaveBeenCalledWith("Property details saved.");
  });

  it("shows error toast when save fails", async () => {
    const detailsRef = { current: {} as ListingPropertyDetails };
    const dirtyRef = { current: true };

    mockSaveListingPropertyDetails.mockRejectedValue(new Error("save failed"));

    const { result } = renderHook(() =>
      useReviewAutoSave({
        userId: "user-1",
        listingId: "listing-1",
        detailsRef,
        dirtyRef,
        updateDetails: jest.fn()
      })
    );

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockToastError).toHaveBeenCalledWith("save failed");
  });

  it("normalizes bathrooms to nearest 0.5 and autosaves", async () => {
    const detailsRef = {
      current: { bathrooms: 2.26 } as ListingPropertyDetails
    };
    const dirtyRef = { current: true };
    const updateDetails = jest.fn((updater: (prev: ListingPropertyDetails) => ListingPropertyDetails) => {
      detailsRef.current = updater(detailsRef.current);
    });

    mockSaveListingPropertyDetails.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReviewAutoSave({
        userId: "user-1",
        listingId: "listing-1",
        detailsRef,
        dirtyRef,
        updateDetails
      })
    );

    act(() => {
      result.current.normalizeBathrooms();
    });

    expect(updateDetails).toHaveBeenCalled();
    expect(detailsRef.current.bathrooms).toBe(2.5);
    expect(mockToastMessage).toHaveBeenCalledWith(
      "Bathrooms rounded to the nearest 0.5."
    );

    await waitFor(() => {
      expect(mockSaveListingPropertyDetails).toHaveBeenCalled();
    });
  });

  it("does not autosave when form is not dirty", () => {
    const detailsRef = { current: {} as ListingPropertyDetails };
    const dirtyRef = { current: false };

    const { result } = renderHook(() =>
      useReviewAutoSave({
        userId: "user-1",
        listingId: "listing-1",
        detailsRef,
        dirtyRef,
        updateDetails: jest.fn()
      })
    );

    act(() => {
      result.current.triggerAutoSave();
    });

    expect(mockSaveListingPropertyDetails).not.toHaveBeenCalled();
  });

  it("normalizes null bathrooms by only autosaving", async () => {
    const detailsRef = {
      current: { bathrooms: null } as ListingPropertyDetails
    };
    const dirtyRef = { current: true };
    const updateDetails = jest.fn();
    mockSaveListingPropertyDetails.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReviewAutoSave({
        userId: "user-1",
        listingId: "listing-1",
        detailsRef,
        dirtyRef,
        updateDetails
      })
    );

    act(() => {
      result.current.normalizeBathrooms();
    });

    expect(updateDetails).not.toHaveBeenCalled();
    expect(mockToastMessage).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockSaveListingPropertyDetails).toHaveBeenCalled();
    });
  });

  it("autosaves without rounding when bathrooms already on 0.5 step", async () => {
    const detailsRef = {
      current: { bathrooms: 2.5 } as ListingPropertyDetails
    };
    const dirtyRef = { current: true };
    const updateDetails = jest.fn();
    mockSaveListingPropertyDetails.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useReviewAutoSave({
        userId: "user-1",
        listingId: "listing-1",
        detailsRef,
        dirtyRef,
        updateDetails
      })
    );

    act(() => {
      result.current.normalizeBathrooms();
    });

    expect(updateDetails).not.toHaveBeenCalled();
    expect(mockToastMessage).not.toHaveBeenCalled();

    await waitFor(() => {
      expect(mockSaveListingPropertyDetails).toHaveBeenCalled();
    });
  });

  it("queues autosave when a save is already in progress", async () => {
    let rejectFirstSave: ((error?: unknown) => void) | null = null;
    mockSaveListingPropertyDetails
      .mockImplementationOnce(
        () =>
          new Promise<void>((_resolve, reject) => {
            rejectFirstSave = reject;
          })
      )
      .mockResolvedValue(undefined);

    const detailsRef = {
      current: { bathrooms: 2 } as ListingPropertyDetails
    };
    const dirtyRef = { current: true };

    const { result } = renderHook(() =>
      useReviewAutoSave({
        userId: "user-1",
        listingId: "listing-1",
        detailsRef,
        dirtyRef,
        updateDetails: jest.fn()
      })
    );

    act(() => {
      void result.current.handleSave({ silent: true });
    });

    act(() => {
      result.current.triggerAutoSave();
    });

    expect(mockSaveListingPropertyDetails).toHaveBeenCalledTimes(1);

    act(() => {
      rejectFirstSave?.(new Error("first save failed"));
    });

    await waitFor(() => {
      expect(mockSaveListingPropertyDetails).toHaveBeenCalledTimes(2);
    });
  });
});
