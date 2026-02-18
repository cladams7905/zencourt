const mockInsertReturning = jest.fn();
const mockInsertValues = jest.fn(() => ({ returning: mockInsertReturning }));
const mockTxInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockTransaction = jest.fn(async (cb: (tx: unknown) => Promise<unknown>) =>
  cb({ insert: (...args: unknown[]) => ((mockTxInsert as (...a: unknown[]) => unknown)(...args)) })
);

const mockUpdateReturning = jest.fn();
const mockUpdateWhere = jest.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);
const mockNanoid = jest.fn(() => "listing-generated");
const mockGetNextDraftNumber = jest.fn();
const mockGetListingById = jest.fn();

jest.mock("nanoid", () => ({ nanoid: () => mockNanoid() }));

jest.mock("@db/client", () => ({
  db: {
    transaction: (...args: unknown[]) => ((mockTransaction as (...a: unknown[]) => unknown)(...args)),
    update: (...args: unknown[]) => ((mockUpdate as (...a: unknown[]) => unknown)(...args))
  },
  listings: { id: "id", userId: "userId" },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/actions/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/actions/db/listings/queries", () => ({
  getNextDraftNumber: (...args: unknown[]) => ((mockGetNextDraftNumber as (...a: unknown[]) => unknown)(...args)),
  getListingById: (...args: unknown[]) => ((mockGetListingById as (...a: unknown[]) => unknown)(...args))
}));

import {
  createListing,
  updateListing
} from "@web/src/server/actions/db/listings/mutations";

describe("listings mutations", () => {
  beforeEach(() => {
    mockInsertReturning.mockReset();
    mockInsertValues.mockClear();
    mockTxInsert.mockClear();
    mockTransaction.mockClear();
    mockUpdateReturning.mockReset();
    mockUpdateWhere.mockClear();
    mockUpdateSet.mockClear();
    mockUpdate.mockClear();
    mockWithDbErrorHandling.mockClear();
    mockNanoid.mockClear();
    mockGetNextDraftNumber.mockReset();
    mockGetListingById.mockReset();
  });

  it("validates required params", async () => {
    await expect(createListing(" ")).rejects.toThrow(
      "User ID is required to create a draft listing"
    );
    await expect(updateListing("", "l1", {})).rejects.toThrow(
      "User ID is required to update a listing"
    );
    await expect(updateListing("u1", "", {})).rejects.toThrow(
      "Listing ID is required"
    );
  });

  it("creates a listing and applies Draft N title", async () => {
    mockInsertReturning.mockResolvedValueOnce([{ id: "l1", userId: "u1" }]);
    mockGetNextDraftNumber.mockResolvedValueOnce(3);
    mockUpdateReturning.mockResolvedValueOnce([{ id: "l1", title: "Draft 3" }]);
    mockGetListingById.mockResolvedValueOnce({
      id: "l1",
      title: "Draft 3",
      userId: "u1"
    });

    const result = await createListing("u1");

    expect(result).toEqual({ id: "l1", title: "Draft 3", userId: "u1" });
    expect(mockGetNextDraftNumber).toHaveBeenCalledWith("u1");
    expect(mockGetListingById).toHaveBeenCalledWith("u1", "l1");
  });

  it("throws when created draft cannot be reloaded", async () => {
    mockInsertReturning.mockResolvedValueOnce([{ id: "l1", userId: "u1" }]);
    mockGetNextDraftNumber.mockResolvedValueOnce(2);
    mockUpdateReturning.mockResolvedValueOnce([{ id: "l1", title: "Draft 2" }]);
    mockGetListingById.mockResolvedValueOnce(null);

    await expect(createListing("u1")).rejects.toThrow(
      "Draft listing could not be saved."
    );
  });

  it("throws when update target is missing", async () => {
    mockUpdateReturning.mockResolvedValueOnce([]);
    await expect(updateListing("u1", "l1", { title: "X" })).rejects.toThrow(
      "Listing not found"
    );
  });
});
