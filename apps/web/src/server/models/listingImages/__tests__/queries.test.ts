const mockOrderBy = jest.fn();
const mockWhere = jest.fn(() => ({ orderBy: mockOrderBy }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

const mockEnsureListingImageAccess = jest.fn();
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

jest.mock("@web/src/server/models/listingImages/helpers", () => ({
  ensureListingImageAccess: (...args: unknown[]) => ((mockEnsureListingImageAccess as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

import { getListingImages } from "@web/src/server/models/listingImages/queries";

describe("listingImages queries", () => {
  beforeEach(() => {
    mockOrderBy.mockReset();
    mockWhere.mockClear();
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockEnsureListingImageAccess.mockReset();
    mockWithDbErrorHandling.mockClear();
  });

  it("fetches listing images", async () => {
    mockOrderBy.mockResolvedValueOnce([{ id: "img1", url: "raw" }]);

    const result = await getListingImages("u1", "l1");

    expect(mockEnsureListingImageAccess).toHaveBeenCalledWith(
      "u1",
      "l1",
      expect.any(Object)
    );
    expect(result).toEqual([{ id: "img1", url: "raw" }]);
  });
});
