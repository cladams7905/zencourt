const mockLimit = jest.fn();
const mockWhere = jest.fn();
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args))
  },
  listings: { id: "id", userId: "userId", title: "title" },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args,
  like: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/actions/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

import {
  getListingById,
  getNextDraftNumber
} from "@web/src/server/actions/db/listings/queries";

describe("listings queries", () => {
  beforeEach(() => {
    mockLimit.mockReset();
    mockWhere.mockReset();
    mockFrom.mockClear();
    mockSelect.mockClear();
    mockWithDbErrorHandling.mockClear();
  });

  it("validates required params", async () => {
    await expect(getListingById("", "l1")).rejects.toThrow(
      "User ID is required to fetch a listing"
    );
    await expect(getListingById("u1", "")).rejects.toThrow(
      "Listing ID is required to fetch a listing"
    );
    await expect(getNextDraftNumber(" ")).rejects.toThrow(
      "User ID is required to fetch draft numbers"
    );
  });

  it("returns listing by id or null", async () => {
    mockWhere.mockImplementationOnce(() => ({ limit: mockLimit }));
    mockLimit.mockResolvedValueOnce([{ id: "l1" }]);
    await expect(getListingById("u1", "l1")).resolves.toEqual({ id: "l1" });

    mockWhere.mockImplementationOnce(() => ({ limit: mockLimit }));
    mockLimit.mockResolvedValueOnce([]);
    await expect(getListingById("u1", "l2")).resolves.toBeNull();
  });

  it("calculates next draft number from existing draft titles", async () => {
    mockWhere.mockResolvedValueOnce([
      { title: "Draft 1" },
      { title: "Draft 4" },
      { title: "Draft bad" },
      { title: "Active Listing" }
    ]);

    await expect(getNextDraftNumber("u1")).resolves.toBe(5);
  });

  it("returns 1 when there are no valid draft titles", async () => {
    mockWhere.mockResolvedValueOnce([{ title: null }, { title: "Home" }]);
    await expect(getNextDraftNumber("u1")).resolves.toBe(1);
  });
});
