const mockOrderBy = jest.fn();
const mockWhere = jest.fn(() => ({ orderBy: mockOrderBy }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

const mockEnsureListingImageAccess = jest.fn();
const mockMapWithSignedUrl = jest.fn();
const mockResolveSignedDownloadUrl = jest.fn();
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args))
  },
  listingImages: { id: "id", listingId: "listingId", uploadedAt: "uploadedAt" },
  eq: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/actions/db/listingImages/helpers", () => ({
  ensureListingImageAccess: (...args: unknown[]) => ((mockEnsureListingImageAccess as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/actions/shared/urlSigning", () => ({
  mapWithSignedUrl: (...args: unknown[]) => ((mockMapWithSignedUrl as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/utils/storageUrls", () => ({
  DEFAULT_THUMBNAIL_TTL_SECONDS: 3600,
  resolveSignedDownloadUrl: (...args: unknown[]) => ((mockResolveSignedDownloadUrl as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/actions/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

import { getListingImages } from "@web/src/server/actions/db/listingImages/queries";

describe("listingImages queries", () => {
  beforeEach(() => {
    mockOrderBy.mockReset();
    mockWhere.mockClear();
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockEnsureListingImageAccess.mockReset();
    mockMapWithSignedUrl.mockReset();
    mockResolveSignedDownloadUrl.mockReset();
    mockWithDbErrorHandling.mockClear();
  });

  it("fetches and signs listing images", async () => {
    mockOrderBy.mockResolvedValueOnce([{ id: "img1", url: "raw" }]);
    mockMapWithSignedUrl.mockResolvedValueOnce([{ id: "img1", url: "signed" }]);

    const result = await getListingImages("u1", "l1");

    expect(mockEnsureListingImageAccess).toHaveBeenCalledWith(
      "u1",
      "l1",
      expect.any(Object)
    );
    expect(result).toEqual([{ id: "img1", url: "signed" }]);
    expect(mockMapWithSignedUrl).toHaveBeenCalledWith(
      [{ id: "img1", url: "raw" }],
      expect.any(Function),
      { fallbackToOriginal: true }
    );
  });
});
