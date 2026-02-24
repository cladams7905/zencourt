import { act, renderHook } from "@testing-library/react";
import { useCategorizeUploads } from "@web/src/components/listings/categorize/domain/hooks/useCategorizeUploads";

const mockPush = jest.fn();
const mockToastError = jest.fn();
const mockGetUploadUrls = jest.fn();
const mockCreateListingImageRecords = jest.fn();
const mockDeleteListingImageUploads = jest.fn();

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

jest.mock("@web/src/server/models/listingImages", () => ({
  getListingImageUploadUrls: (...args: unknown[]) => mockGetUploadUrls(...args),
  createListingImageRecords: (...args: unknown[]) =>
    mockCreateListingImageRecords(...args),
  deleteListingImageUploads: (...args: unknown[]) =>
    mockDeleteListingImageUploads(...args)
}));

describe("useCategorizeUploads", () => {
  const imageMetadata = {
    width: 100,
    height: 100,
    format: "jpeg",
    size: 123,
    lastModified: 1
  };

  beforeEach(() => {
    mockPush.mockReset();
    mockToastError.mockReset();
    mockGetUploadUrls.mockReset();
    mockCreateListingImageRecords.mockReset();
    mockDeleteListingImageUploads.mockReset();
  });

  it("delegates upload url retrieval", async () => {
    mockGetUploadUrls.mockResolvedValue({ uploads: [], failed: [] });
    const { result } = renderHook(() =>
      useCategorizeUploads({
        userId: "u1",
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn(),
        setImages: jest.fn()
      })
    );

    await act(async () => {
      await result.current.getUploadUrls([]);
    });

    expect(mockGetUploadUrls).toHaveBeenCalledWith("u1", "l1", []);
  });

  it("navigates to processing after successful record creation", async () => {
    mockCreateListingImageRecords.mockResolvedValue([
      {
        id: "img1",
        url: "u",
        filename: "a.jpg",
        category: null,
        isPrimary: false,
        primaryScore: null
      }
    ]);
    const { result } = renderHook(() =>
      useCategorizeUploads({
        userId: "u1",
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn(),
        setImages: jest.fn()
      })
    );

    await act(async () => {
      await result.current.onCreateRecords([
        { key: "k", fileName: "a.jpg", publicUrl: "u", metadata: imageMetadata }
      ]);
    });

    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("/listings/l1/categorize/processing?batch=1")
    );
  });

  it("cleans up uploads when record creation fails", async () => {
    mockCreateListingImageRecords.mockRejectedValue(new Error("save failed"));
    mockDeleteListingImageUploads.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useCategorizeUploads({
        userId: "u1",
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn(),
        setImages: jest.fn()
      })
    );

    await act(async () => {
      await result.current.onCreateRecords([
        { key: "k", fileName: "a.jpg", publicUrl: "u", metadata: imageMetadata }
      ]);
    });

    expect(mockDeleteListingImageUploads).toHaveBeenCalledWith("u1", "l1", [
      "u"
    ]);
    expect(mockToastError).toHaveBeenCalled();
  });

  it("builds processing route with and without batch count", () => {
    const { result } = renderHook(() =>
      useCategorizeUploads({
        userId: "u1",
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn(),
        setImages: jest.fn()
      })
    );

    act(() => {
      result.current.onUploadsComplete({ count: 0, batchStartedAt: 100 });
      result.current.onUploadsComplete({ count: 2, batchStartedAt: 101 });
    });

    expect(mockPush).toHaveBeenCalledWith(
      "/listings/l1/categorize/processing?batchStartedAt=100"
    );
    expect(mockPush).toHaveBeenCalledWith(
      "/listings/l1/categorize/processing?batch=2&batchStartedAt=101"
    );
  });
});
