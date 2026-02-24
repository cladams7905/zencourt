const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));
const mockUpdateWhere = jest.fn();
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockGetListingById = jest.fn();
const mockAssignPrimaryListingImageForCategory = jest.fn();

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args)),
    update: (...args: unknown[]) => ((mockUpdate as (...a: unknown[]) => unknown)(...args))
  },
  listingImages: {
    id: "id",
    listingId: "listingId",
    category: "category"
  },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/actions/db/listings", () => ({
  getListingById: (...args: unknown[]) => ((mockGetListingById as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/actions/db/listingImages", () => ({
  assignPrimaryListingImageForCategory: (...args: unknown[]) => ((mockAssignPrimaryListingImageForCategory as (...a: unknown[]) => unknown)(...args))
}));

import {
  assertListingExists,
  loadListingImages,
  persistListingImageAnalysis,
  toSerializableImageData
} from "@web/src/server/actions/api/vision/helpers";

describe("vision helper actions", () => {
  beforeEach(() => {
    mockSelectWhere.mockReset();
    mockSelectFrom.mockClear();
    mockSelect.mockClear();
    mockUpdateWhere.mockReset();
    mockUpdateSet.mockClear();
    mockUpdate.mockClear();
    mockGetListingById.mockReset();
    mockAssignPrimaryListingImageForCategory.mockReset();
  });

  it("asserts listing existence", async () => {
    mockGetListingById.mockResolvedValueOnce({ id: "l1" });
    await expect(assertListingExists("u1", "l1")).resolves.toBeUndefined();

    mockGetListingById.mockResolvedValueOnce(null);
    await expect(assertListingExists("u1", "l2")).rejects.toThrow("Listing not found");
  });

  it("loads listing images with or without ids", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ id: "img-1" }]);
    await expect(loadListingImages("l1")).resolves.toEqual([{ id: "img-1" }]);

    mockSelectWhere.mockResolvedValueOnce([{ id: "img-2" }]);
    await expect(loadListingImages("l1", ["img-2"])) .resolves.toEqual([{ id: "img-2" }]);
  });

  it("maps image to serializable shape", () => {
    const mapped = toSerializableImageData({
      id: "img-1",
      listingId: "l1",
      url: "https://x",
      filename: "a.jpg",
      category: null,
      confidence: null,
      primaryScore: null,
      isPrimary: null,
      metadata: null
    } as never);

    expect(mapped).toEqual(
      expect.objectContaining({ id: "img-1", status: "uploaded", isPrimary: false })
    );
  });

  it("persists analyzed image fields", async () => {
    mockUpdateWhere.mockResolvedValueOnce(undefined);
    await expect(
      persistListingImageAnalysis("l1", {
        id: "img-1",
        category: "kitchen",
        confidence: 0.9,
        primaryScore: 0.6,
        metadata: null
      } as never)
    ).resolves.toBeUndefined();
    expect(mockUpdate).toHaveBeenCalled();
  });
});
