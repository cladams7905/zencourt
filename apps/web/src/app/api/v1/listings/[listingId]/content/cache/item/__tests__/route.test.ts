/** @jest-environment node */

import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";

const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockDeleteCachedListingContentItem = jest.fn();

jest.mock("@web/src/app/api/v1/_utils", () => {
  class ApiError extends Error {
    status: number;
    body: { error: string; message: string };
    constructor(status: number, body: { error: string; message: string }) {
      super(body.message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  }
  return {
    ApiError,
    requireAuthenticatedUser: (...args: unknown[]) =>
      mockRequireAuthenticatedUser(...args),
    requireListingAccess: (...args: unknown[]) =>
      mockRequireListingAccess(...args)
  };
});

jest.mock("@web/src/server/actions/api/listings/cache", () => ({
  deleteCachedListingContentItem: (...args: unknown[]) =>
    mockDeleteCachedListingContentItem(...args)
}));

import { DELETE } from "../route";

const REQUIRED_MSG =
  "cacheKeyTimestamp, cacheKeyId, and valid subcategory are required";

describe("DELETE /api/v1/listings/[listingId]/content/cache/item", () => {
  const listingId = "listing-1";
  const params = Promise.resolve({ listingId });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRequireListingAccess.mockResolvedValue(undefined);
    const { ApiError } = jest.requireMock("@web/src/app/api/v1/_utils");
    mockDeleteCachedListingContentItem.mockImplementation(
      async (
        _listingId: string,
        p: {
          cacheKeyTimestamp?: number;
          cacheKeyId?: number;
          subcategory?: string;
        }
      ) => {
        const ts = p.cacheKeyTimestamp;
        const id = p.cacheKeyId;
        const sub = p.subcategory?.trim();
        if (
          typeof ts !== "number" ||
          !Number.isFinite(ts) ||
          ts <= 0 ||
          typeof id !== "number" ||
          !Number.isFinite(id) ||
          id <= 0 ||
          !sub ||
          !(LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(sub)
        ) {
          throw new ApiError(400, {
            error: "Invalid request",
            message: REQUIRED_MSG
          });
        }
      }
    );
  });

  it("returns 204 and deletes cache item when body is valid", async () => {
    const request = {
      json: async () => ({
        cacheKeyTimestamp: 1700000000,
        cacheKeyId: 1,
        subcategory: "new_listing"
      })
    } as unknown as Request;

    const response = await DELETE(request as never, { params });

    expect(response.status).toBe(204);
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledTimes(1);
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledWith(listingId, {
      cacheKeyTimestamp: 1700000000,
      cacheKeyId: 1,
      subcategory: "new_listing"
    });
  });

  it("returns 400 when cacheKeyTimestamp is missing", async () => {
    const request = {
      json: async () => ({
        cacheKeyId: 1,
        subcategory: "new_listing"
      })
    } as unknown as Request;

    const response = await DELETE(request as never, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe(REQUIRED_MSG);
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when cacheKeyId is missing", async () => {
    const request = {
      json: async () => ({
        cacheKeyTimestamp: 1700000000,
        subcategory: "new_listing"
      })
    } as unknown as Request;

    const response = await DELETE(request as never, { params });

    expect(response.status).toBe(400);
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when subcategory is missing", async () => {
    const request = {
      json: async () => ({
        cacheKeyTimestamp: 1700000000,
        cacheKeyId: 1
      })
    } as unknown as Request;

    const response = await DELETE(request as never, { params });

    expect(response.status).toBe(400);
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when subcategory is invalid", async () => {
    const request = {
      json: async () => ({
        cacheKeyTimestamp: 1700000000,
        cacheKeyId: 1,
        subcategory: "invalid_subcategory"
      })
    } as unknown as Request;

    const response = await DELETE(request as never, { params });

    expect(response.status).toBe(400);
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledTimes(1);
  });

  it("returns 400 when body is null", async () => {
    const request = { json: async () => null } as unknown as Request;

    const response = await DELETE(request as never, { params });

    expect(response.status).toBe(400);
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledTimes(1);
  });

  it("accepts any valid LISTING_CONTENT_SUBCATEGORIES value", async () => {
    const request = {
      json: async () => ({
        cacheKeyTimestamp: 1700000001,
        cacheKeyId: 2,
        subcategory: "open_house"
      })
    } as unknown as Request;

    const response = await DELETE(request as never, { params });

    expect(response.status).toBe(204);
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledWith(
      listingId,
      expect.objectContaining({
        subcategory: "open_house",
        cacheKeyTimestamp: 1700000001,
        cacheKeyId: 2
      })
    );
  });

  it("returns 401 when user is not authenticated", async () => {
    const { ApiError } = jest.requireMock("@web/src/app/api/v1/_utils");
    mockDeleteCachedListingContentItem.mockRejectedValueOnce(
      new ApiError(401, {
        error: "Unauthorized",
        message: "Please sign in to continue"
      })
    );

    const request = {
      json: async () => ({
        cacheKeyTimestamp: 1700000000,
        cacheKeyId: 1,
        subcategory: "new_listing"
      })
    } as unknown as Request;

    const response = await DELETE(request as never, { params });
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.message).toBe("Please sign in to continue");
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledTimes(1);
  });
});

export {};
