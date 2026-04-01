import { act, renderHook } from "@testing-library/react";
import { useUploadFlow } from "@web/src/components/listings/stage/upload/domain/hooks/useUploadFlow";

const mockCreateListing = jest.fn();
const mockCreateListingImageRecords = jest.fn();
const mockGetListingImageUploadUrls = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();
const mockEmitListingSidebarHeartbeat = jest.fn();
const mockGetImageMetadataFromFile = jest.fn();

jest.mock("@web/src/server/actions/listings/commands", () => ({
  createListingForCurrentUser: (...args: unknown[]) =>
    mockCreateListing(...args)
}));

jest.mock("@web/src/server/actions/listings/image", () => ({
  createListingImageRecordsForCurrentUser: (...args: unknown[]) =>
    mockCreateListingImageRecords(...args),
  getListingImageUploadUrlsForCurrentUser: (...args: unknown[]) =>
    mockGetListingImageUploadUrls(...args)
}));

jest.mock("@web/src/lib/domain/listings/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args),
  emitListingSidebarHeartbeat: (...args: unknown[]) =>
    mockEmitListingSidebarHeartbeat(...args)
}));

jest.mock("@web/src/lib/domain/media/imageMetadata", () => ({
  getImageMetadataFromFile: (...args: unknown[]) =>
    mockGetImageMetadataFromFile(...args)
}));

describe("useUploadFlow", () => {
  beforeEach(() => {
    mockCreateListing.mockReset();
    mockCreateListingImageRecords.mockReset();
    mockGetListingImageUploadUrls.mockReset();
    mockEmitListingSidebarUpdate.mockReset();
    mockEmitListingSidebarHeartbeat.mockReset();
    mockGetImageMetadataFromFile.mockReset();
  });

  it("emits sidebar heartbeat when mounted with an existing listing", () => {
    renderHook(() =>
      useUploadFlow({
        listingId: "listing-existing",
        onUploadsComplete: jest.fn()
      })
    );

    expect(mockEmitListingSidebarHeartbeat).toHaveBeenCalledTimes(1);
    expect(mockEmitListingSidebarHeartbeat).toHaveBeenCalledWith({
      id: "listing-existing",
      lastOpenedAt: expect.any(String)
    });
  });

  it("dedupes concurrent listing creation", async () => {
    let resolveDraft: ((value: unknown) => void) | null = null;
    mockCreateListing.mockImplementation(
      () => new Promise((resolve) => (resolveDraft = resolve))
    );

    const { result } = renderHook(() =>
      useUploadFlow({ onUploadsComplete: jest.fn() })
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

      resolveDraft?.({
        id: "listing-1",
        title: null,
        listingStage: "upload"
      });
      await Promise.all([p1, p2]);
    });

    expect(id1).toBe("listing-1");
    expect(id2).toBe("listing-1");
    expect(mockEmitListingSidebarUpdate).toHaveBeenCalledTimes(1);
  });

  it("creates draft listing on-demand before creating records", async () => {
    mockCreateListing.mockResolvedValue({
      id: "listing-1",
      title: null,
      listingStage: "upload"
    });
    const { result } = renderHook(() =>
      useUploadFlow({ onUploadsComplete: jest.fn() })
    );

    await act(async () => {
      await result.current.onCreateRecords([]);
    });

    expect(mockCreateListing).toHaveBeenCalledTimes(1);
    expect(mockCreateListingImageRecords).toHaveBeenCalledWith("listing-1", []);
  });

  it("creates records and reports inline processing batch metadata after uploads complete", async () => {
    const onUploadsComplete = jest.fn();
    mockCreateListing.mockResolvedValue({
      id: "listing-1",
      title: "Title",
      listingStage: "upload"
    });
    mockCreateListingImageRecords.mockResolvedValue([
      { id: "img-1" },
      { id: "img-2" }
    ]);

    const { result } = renderHook(() =>
      useUploadFlow({ onUploadsComplete, listingId: "listing-1" })
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

    expect(onUploadsComplete).toHaveBeenCalledWith({
      listingId: "listing-1",
      batchImageIds: ["img-1", "img-2"],
      batchStartedAt: 123
    });
  });

  it("builds record input from upload metadata helper", async () => {
    mockGetImageMetadataFromFile.mockResolvedValue({ width: 10, height: 10 });

    const { result } = renderHook(() =>
      useUploadFlow({ onUploadsComplete: jest.fn() })
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
