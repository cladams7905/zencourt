import { act, renderHook } from "@testing-library/react";
import { useSyncUploadFlow } from "@web/src/components/listings/sync/domain/hooks/useSyncUploadFlow";

const mockCreateListing = jest.fn();
const mockCreateListingImageRecords = jest.fn();
const mockGetListingImageUploadUrls = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();
const mockGetImageMetadataFromFile = jest.fn();

jest.mock("@web/src/server/actions/listings/commands", () => ({
  createListingForCurrentUser: (...args: unknown[]) => mockCreateListing(...args),
  createListingImageRecordsForCurrentUser: (...args: unknown[]) =>
    mockCreateListingImageRecords(...args),
  getListingImageUploadUrlsForCurrentUser: (...args: unknown[]) =>
    mockGetListingImageUploadUrls(...args)
}));

jest.mock("@web/src/lib/domain/listing/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

jest.mock("@web/src/lib/domain/media/imageMetadata", () => ({
  getImageMetadataFromFile: (...args: unknown[]) =>
    mockGetImageMetadataFromFile(...args)
}));

describe("useSyncUploadFlow", () => {
  beforeEach(() => {
    mockCreateListing.mockReset();
    mockCreateListingImageRecords.mockReset();
    mockGetListingImageUploadUrls.mockReset();
    mockEmitListingSidebarUpdate.mockReset();
    mockGetImageMetadataFromFile.mockReset();
  });

  it("dedupes concurrent listing creation", async () => {
    let resolveDraft: ((value: unknown) => void) | null = null;
    mockCreateListing.mockImplementation(
      () => new Promise((resolve) => (resolveDraft = resolve))
    );

    const { result } = renderHook(() =>
      useSyncUploadFlow({ navigate: jest.fn() })
    );

    let id1 = "";
    let id2 = "";

    await act(async () => {
      const p1 = result.current.ensureListingId().then((id) => {
        id1 = id;
      });
      const p2 = result.current.ensureListingId().then((id) => {
        id2 = id;
      });

      expect(mockCreateListing).toHaveBeenCalledTimes(1);

      resolveDraft?.({ id: "listing-1", title: null, listingStage: "categorize" });
      await Promise.all([p1, p2]);
    });

    expect(id1).toBe("listing-1");
    expect(id2).toBe("listing-1");
    expect(mockEmitListingSidebarUpdate).toHaveBeenCalledTimes(1);
  });

  it("throws when creating records without listing", async () => {
    const { result } = renderHook(() =>
      useSyncUploadFlow({ navigate: jest.fn() })
    );

    await expect(result.current.onCreateRecords([])).rejects.toThrow(
      "Listing is missing for upload."
    );
  });

  it("creates records and navigates after uploads complete", async () => {
    const navigate = jest.fn();
    mockCreateListing.mockResolvedValue({
      id: "listing-1",
      title: "Title",
      listingStage: "categorize"
    });
    mockCreateListingImageRecords.mockResolvedValue(undefined);

    const { result } = renderHook(() =>
      useSyncUploadFlow({ navigate })
    );

    await act(async () => {
      await result.current.ensureListingId();
      await result.current.onCreateRecords([
        { key: "k", fileName: "a.jpg", publicUrl: "https://cdn/a.jpg" }
      ]);
    });

    expect(mockCreateListingImageRecords).toHaveBeenCalledWith("listing-1", [
      { key: "k", fileName: "a.jpg", publicUrl: "https://cdn/a.jpg" }
    ]);

    act(() => {
      result.current.onUploadsComplete({ count: 2, batchStartedAt: 123 });
    });

    expect(navigate).toHaveBeenCalledWith(
      "/listings/listing-1/categorize/processing?batch=2&batchStartedAt=123"
    );
  });

  it("builds record input from upload metadata helper", async () => {
    mockGetImageMetadataFromFile.mockResolvedValue({ width: 10, height: 10 });

    const { result } = renderHook(() =>
      useSyncUploadFlow({ navigate: jest.fn() })
    );

    const file = new File(["x"], "x.jpg", { type: "image/jpeg" });
    const record = await result.current.buildRecordInput({
      upload: {
        key: "k1",
        fileName: "x.jpg",
        publicUrl: "https://cdn/x.jpg"
      },
      file,
      thumbnailFailed: false
    });

    expect(record).toEqual({
      key: "k1",
      fileName: "x.jpg",
      publicUrl: "https://cdn/x.jpg",
      metadata: { width: 10, height: 10 }
    });
  });
});
