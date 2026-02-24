const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

const mockDeleteWhere = jest.fn();
const mockDelete = jest.fn(() => ({ where: mockDeleteWhere }));

const mockUpdateWhere = jest.fn();
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockInsertReturning = jest.fn();
const mockInsertValues = jest.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockEnsureListingImageAccess = jest.fn();
const mockGetListingFolder = jest.fn(
  (listingId: string, userId: string) => `user_${userId}/listings/listing_${listingId}`
);
const mockNanoid = jest.fn(() => "img-generated");
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("nanoid", () => ({ nanoid: () => mockNanoid() }));

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args)),
    delete: (...args: unknown[]) => ((mockDelete as (...a: unknown[]) => unknown)(...args)),
    update: (...args: unknown[]) => ((mockUpdate as (...a: unknown[]) => unknown)(...args)),
    insert: (...args: unknown[]) => ((mockInsert as (...a: unknown[]) => unknown)(...args))
  },
  listingImages: {
    id: "id",
    listingId: "listingId",
    url: "url",
    category: "category",
    primaryScore: "primaryScore",
    uploadedAt: "uploadedAt",
    isPrimary: "isPrimary"
  },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  ne: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/models/listingImages/helpers", () => ({
  ensureListingImageAccess: (...args: unknown[]) => ((mockEnsureListingImageAccess as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@shared/utils/storagePaths", () => ({
  getListingFolder: (...args: unknown[]) => ((mockGetListingFolder as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

import {
  assignPrimaryListingImageForCategory,
  createListingImageRecords,
  updateListingImageAssignments
} from "@web/src/server/models/listingImages/mutations";

describe("listingImages mutations", () => {
  beforeEach(() => {
    mockSelectWhere.mockReset();
    mockSelectFrom.mockClear();
    mockSelect.mockClear();
    mockDeleteWhere.mockReset();
    mockDelete.mockClear();
    mockUpdateWhere.mockReset();
    mockUpdateSet.mockClear();
    mockUpdate.mockClear();
    mockInsertReturning.mockReset();
    mockInsertValues.mockClear();
    mockInsert.mockClear();
    mockEnsureListingImageAccess.mockReset();
    mockGetListingFolder.mockClear();
    mockNanoid.mockClear();
    mockWithDbErrorHandling.mockClear();
  });

  it("returns null when category is empty", async () => {
    await expect(
      assignPrimaryListingImageForCategory("u1", "l1", "")
    ).resolves.toEqual({ primaryImageId: null });
    expect(mockSelect).not.toHaveBeenCalled();
  });

  it("creates no rows when upload list is empty", async () => {
    await expect(createListingImageRecords("u1", "l1", [])).resolves.toEqual([]);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("rejects invalid upload key prefix", async () => {
    await expect(
      createListingImageRecords("u1", "l1", [
        { key: "wrong/path/a.jpg", fileName: "a.jpg", publicUrl: "https://x" }
      ])
    ).rejects.toThrow("Invalid listing image upload key");
  });

  it("assigns best primary image by score", async () => {
    mockSelectWhere.mockResolvedValueOnce([
      {
        id: "img-1",
        primaryScore: 0.5,
        uploadedAt: new Date("2025-01-01T00:00:00.000Z"),
        isPrimary: true
      },
      {
        id: "img-2",
        primaryScore: 0.9,
        uploadedAt: new Date("2025-01-02T00:00:00.000Z"),
        isPrimary: false
      }
    ]);
    mockUpdateWhere.mockResolvedValue(undefined);

    const result = await assignPrimaryListingImageForCategory("u1", "l1", "kitchen");

    expect(result).toEqual({ primaryImageId: "img-2" });
    expect(mockUpdate).toHaveBeenCalledTimes(2);
  });

  it("updates assignments and deletes selected rows", async () => {
    mockDeleteWhere.mockResolvedValueOnce(undefined);
    mockUpdateWhere.mockResolvedValue(undefined);

    const result = await updateListingImageAssignments(
      "u1",
      "l1",
      [{ id: "img-1", category: "kitchen", isPrimary: true }],
      ["d1"]
    );

    expect(result).toEqual({ updated: 1, deleted: 1 });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("saves listing image records for valid uploads", async () => {
    mockInsertReturning.mockResolvedValueOnce([{ id: "img-generated", listingId: "l1" }]);

    const result = await createListingImageRecords("u1", "l1", [
      {
        key: "user_u1/listings/listing_l1/images/front.jpg",
        fileName: "front.jpg",
        publicUrl: "https://public/front.jpg"
      }
    ]);

    expect(result).toEqual([{ id: "img-generated", listingId: "l1" }]);
    expect(mockInsert).toHaveBeenCalled();
  });

});
