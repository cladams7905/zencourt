const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

const mockEnsureListingImageAccess = jest.fn();
const mockGetSignedUploadUrl = jest.fn();
const mockBuildPublicUrlForKey = jest.fn((key: string) => `https://public/${key}`);
const mockGetListingImagePath = jest.fn(
  (userId: string, listingId: string, fileName: string) =>
    `user_${userId}/listings/listing_${listingId}/images/${fileName}`
);
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args))
  },
  listingImages: { id: "id", listingId: "listingId" },
  eq: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/actions/db/listingImages/helpers", () => ({
  ensureListingImageAccess: (...args: unknown[]) => ((mockEnsureListingImageAccess as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: {
    getSignedUploadUrl: (...args: unknown[]) => ((mockGetSignedUploadUrl as (...a: unknown[]) => unknown)(...args)),
    buildPublicUrlForKey: (...args: unknown[]) => ((mockBuildPublicUrlForKey as (...a: unknown[]) => unknown)(...args))
  }
}));

jest.mock("@shared/utils/storagePaths", () => ({
  getListingImagePath: (...args: unknown[]) => ((mockGetListingImagePath as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/actions/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

import { MAX_IMAGE_BYTES } from "@shared/utils/mediaUpload";
import { getListingImageUploadUrls } from "@web/src/server/actions/db/listingImages/uploads";

describe("listingImages uploads", () => {
  beforeEach(() => {
    mockSelectWhere.mockReset();
    mockSelectFrom.mockClear();
    mockSelect.mockClear();
    mockEnsureListingImageAccess.mockReset();
    mockGetSignedUploadUrl.mockReset();
    mockBuildPublicUrlForKey.mockClear();
    mockGetListingImagePath.mockClear();
    mockWithDbErrorHandling.mockClear();
  });

  it("throws when files are missing", async () => {
    await expect(getListingImageUploadUrls("u1", "l1", [])).rejects.toThrow(
      "No files provided for upload"
    );
  });

  it("rejects when total image count exceeds 20", async () => {
    mockSelectWhere.mockResolvedValueOnce(
      Array.from({ length: 20 }).map((_, i) => ({ id: `img-${i}` }))
    );

    await expect(
      getListingImageUploadUrls("u1", "l1", [
        { id: "f1", fileName: "a.jpg", fileType: "image/jpeg", fileSize: 1 }
      ])
    ).rejects.toThrow("Listings can contain up to 20 photos.");
  });

  it("returns failed entries for invalid files and signing failures", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);
    mockGetSignedUploadUrl.mockResolvedValueOnce({ success: false, error: "sign failed" });

    const result = await getListingImageUploadUrls("u1", "l1", [
      { id: "bad-type", fileName: "doc.pdf", fileType: "application/pdf", fileSize: 100 },
      {
        id: "too-big",
        fileName: "big.jpg",
        fileType: "image/jpeg",
        fileSize: MAX_IMAGE_BYTES + 1
      },
      {
        id: "sign-error",
        fileName: "ok.jpg",
        fileType: "image/jpeg",
        fileSize: 500
      }
    ]);

    expect(result.uploads).toEqual([]);
    expect(result.failed).toHaveLength(3);
    expect(result.failed.map((f) => f.id)).toEqual([
      "bad-type",
      "too-big",
      "sign-error"
    ]);
  });

  it("returns signed upload payloads for valid files", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);
    mockGetSignedUploadUrl.mockResolvedValueOnce({
      success: true,
      url: "https://signed-upload"
    });

    const result = await getListingImageUploadUrls("u1", "l1", [
      { id: "f1", fileName: "front.jpg", fileType: "image/jpeg", fileSize: 100 }
    ]);

    expect(mockEnsureListingImageAccess).toHaveBeenCalledWith(
      "u1",
      "l1",
      expect.any(Object)
    );
    expect(result.failed).toEqual([]);
    expect(result.uploads).toEqual([
      {
        id: "f1",
        fileName: "front.jpg",
        key: "user_u1/listings/listing_l1/images/front.jpg",
        uploadUrl: "https://signed-upload",
        publicUrl: "https://public/user_u1/listings/listing_l1/images/front.jpg"
      }
    ]);
  });
});
