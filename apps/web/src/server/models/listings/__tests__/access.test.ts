const mockLimit = jest.fn();
const mockWhere = jest.fn();
const mockFrom = jest.fn(() => ({ where: mockWhere }));
const mockSelect = jest.fn(() => ({ from: mockFrom }));

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) =>
      (mockSelect as (...a: unknown[]) => unknown)(...args)
  },
  listings: { id: "id", userId: "userId" },
  eq: (...args: unknown[]) => args,
  and: (...args: unknown[]) => args
}));

import { requireListingAccess } from "@web/src/server/models/listings/access";
import { ApiError } from "@web/src/server/errors/api";
import { StatusCode } from "@shared/types/api";

describe("listings access", () => {
  beforeEach(() => {
    mockLimit.mockReset();
    mockWhere.mockReset();
    mockFrom.mockClear();
    mockSelect.mockClear();
  });

  it("throws BAD_REQUEST when listingId is missing", async () => {
    await expect(requireListingAccess(null, "user-1")).rejects.toThrow(ApiError);
    await expect(requireListingAccess(undefined, "user-1")).rejects.toThrow(
      ApiError
    );
    await expect(requireListingAccess("", "user-1")).rejects.toThrow(ApiError);
  });

  it("throws ApiError with status 400 and listing ID message when listingId is missing", async () => {
    try {
      await requireListingAccess(null, "user-1");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(StatusCode.BAD_REQUEST);
      expect((e as ApiError).body.message).toBe("Listing ID is required");
    }
  });

  it("returns listing when user owns it", async () => {
    const listing = { id: "listing-1", userId: "user-1", title: "My Listing" };
    mockWhere.mockImplementationOnce(() => ({ limit: mockLimit }));
    mockLimit.mockResolvedValueOnce([listing]);

    const result = await requireListingAccess("listing-1", "user-1");
    expect(result).toEqual(listing);
  });

  it("throws NOT_FOUND when listing does not exist", async () => {
    mockWhere
      .mockImplementationOnce(() => ({ limit: mockLimit }))
      .mockImplementationOnce(() => ({ limit: mockLimit }));
    mockLimit.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    try {
      await requireListingAccess("missing-id", "user-1");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(StatusCode.NOT_FOUND);
      expect((e as ApiError).body.message).toBe("Listing not found");
    }
  });

  it("throws FORBIDDEN when listing exists but belongs to another user", async () => {
    mockWhere
      .mockImplementationOnce(() => ({ limit: mockLimit }))
      .mockImplementationOnce(() => ({ limit: mockLimit }));
    mockLimit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: "listing-1" }]);

    try {
      await requireListingAccess("listing-1", "other-user");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(StatusCode.FORBIDDEN);
      expect((e as ApiError).body.message).toBe(
        "You don't have access to this listing"
      );
    }
  });
});
