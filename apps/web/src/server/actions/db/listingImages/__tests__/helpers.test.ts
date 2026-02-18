const mockLimit = jest.fn();
const mockWhere = jest.fn(() => ({ limit: mockLimit }));
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args))
  },
  listings: { id: "id", userId: "userId" },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args
}));

import { ensureListingImageAccess } from "@web/src/server/actions/db/listingImages/helpers";

describe("listingImages helpers", () => {
  beforeEach(() => {
    mockLimit.mockReset();
    mockWhere.mockClear();
    mockFrom.mockClear();
    mockSelect.mockClear();
  });

  it("validates required params", async () => {
    await expect(
      ensureListingImageAccess("", "l1", {
        userIdError: "u required",
        listingIdError: "l required"
      })
    ).rejects.toThrow("u required");

    await expect(
      ensureListingImageAccess("u1", "", {
        userIdError: "u required",
        listingIdError: "l required"
      })
    ).rejects.toThrow("l required");
  });

  it("returns listing when owned by user", async () => {
    mockLimit.mockResolvedValueOnce([{ id: "l1", userId: "u1" }]);

    await expect(
      ensureListingImageAccess("u1", "l1", {
        userIdError: "u required",
        listingIdError: "l required"
      })
    ).resolves.toEqual({ id: "l1", userId: "u1" });
  });

  it("throws when listing is not found", async () => {
    mockLimit.mockResolvedValueOnce([]);

    await expect(
      ensureListingImageAccess("u1", "missing", {
        userIdError: "u required",
        listingIdError: "l required"
      })
    ).rejects.toThrow("Listing not found");
  });
});
