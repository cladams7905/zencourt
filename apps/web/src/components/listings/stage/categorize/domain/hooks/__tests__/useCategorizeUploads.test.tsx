import { act, renderHook } from "@testing-library/react";
import { useCategorizeUploads } from "@web/src/components/listings/stage/categorize/domain/hooks/useCategorizeUploads";

const mockToastError = jest.fn();
const mockGetUploadUrls = jest.fn();
const mockCreateListingImageRecords = jest.fn();
const mockDeleteListingImageUploads = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("@web/src/server/actions/listings/image", () => ({
  getListingImageUploadUrlsForCurrentUser: (...args: unknown[]) =>
    mockGetUploadUrls(...args),
  createListingImageRecordsForCurrentUser: (...args: unknown[]) =>
    mockCreateListingImageRecords(...args),
  deleteListingImageUploadsForCurrentUser: (...args: unknown[]) =>
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
    mockToastError.mockReset();
    mockGetUploadUrls.mockReset();
    mockCreateListingImageRecords.mockReset();
    mockDeleteListingImageUploads.mockReset();
  });

  it("delegates upload url retrieval", async () => {
    mockGetUploadUrls.mockResolvedValue({ uploads: [], failed: [] });
    const { result } = renderHook(() =>
      useCategorizeUploads({
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn(),
        setImages: jest.fn()
      })
    );

    await act(async () => {
      await result.current.getUploadUrls([]);
    });

    expect(mockGetUploadUrls).toHaveBeenCalledWith("l1", []);
  });

  it("reports an inline processing batch after successful record creation", async () => {
    mockCreateListingImageRecords.mockResolvedValue([
      {
        id: "img1",
        url: "u",
        filename: "a.jpg",
        category: null,
        recommendationScore: null,
        shotType: "room",
        analysisStatus: "pending",
        metadata: null
      }
    ]);
    const onProcessingBatchCreated = jest.fn();
    const { result } = renderHook(() =>
      useCategorizeUploads({
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn(),
        setImages: jest.fn(),
        onProcessingBatchCreated
      })
    );

    await act(async () => {
      await result.current.onCreateRecords([
        { key: "k", fileName: "a.jpg", publicUrl: "u", metadata: imageMetadata }
      ]);
    });

    expect(onProcessingBatchCreated).toHaveBeenCalledWith({
      listingId: "l1",
      batchImageIds: ["img1"],
      batchStartedAt: expect.any(Number),
      createdImages: [
        expect.objectContaining({
          id: "img1",
          analysisStatus: "pending"
        })
      ]
    });
  });

  it("cleans up uploads when record creation fails", async () => {
    mockCreateListingImageRecords.mockRejectedValue(new Error("save failed"));
    mockDeleteListingImageUploads.mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useCategorizeUploads({
        listingId: "l1",
        runDraftSave: async <T,>(fn: () => Promise<T>) => fn(),
        setImages: jest.fn(),
        onProcessingBatchCreated: jest.fn()
      })
    );

    await act(async () => {
      await result.current.onCreateRecords([
        { key: "k", fileName: "a.jpg", publicUrl: "u", metadata: imageMetadata }
      ]);
    });

    expect(mockDeleteListingImageUploads).toHaveBeenCalledWith("l1", ["u"]);
    expect(mockToastError).toHaveBeenCalled();
  });
});
