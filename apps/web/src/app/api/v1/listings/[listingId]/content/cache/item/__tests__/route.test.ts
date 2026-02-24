/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockDeleteCachedListingContentItem = jest.fn();

jest.mock("@web/src/app/api/v1/_utils", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    body: { error: string; message: string };
    constructor(status: number, body: { error: string; message: string }) {
      super(body.message);
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
  requireAuthenticatedUser: (...args: unknown[]) =>
    mockRequireAuthenticatedUser(...args),
  requireListingAccess: (...args: unknown[]) =>
    mockRequireListingAccess(...args)
}));

jest.mock("@web/src/server/services/cache/listingContent", () => ({
  deleteCachedListingContentItem: (...args: unknown[]) =>
    mockDeleteCachedListingContentItem(...args)
}));

import { DELETE } from "../route";

describe("DELETE /api/v1/listings/[listingId]/content/cache/item", () => {
  const listingId = "listing-1";
  const params = Promise.resolve({ listingId });

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRequireListingAccess.mockResolvedValue(undefined);
    mockDeleteCachedListingContentItem.mockResolvedValue(undefined);
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
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledWith({
      userId: "user-1",
      listingId,
      subcategory: "new_listing",
      mediaType: "image",
      timestamp: 1700000000,
      id: 1
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
    expect(data.message).toContain("cacheKeyTimestamp, cacheKeyId, and valid subcategory are required");
    expect(mockDeleteCachedListingContentItem).not.toHaveBeenCalled();
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
    expect(mockDeleteCachedListingContentItem).not.toHaveBeenCalled();
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
    expect(mockDeleteCachedListingContentItem).not.toHaveBeenCalled();
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
    expect(mockDeleteCachedListingContentItem).not.toHaveBeenCalled();
  });

  it("returns 400 when body is null", async () => {
    const request = { json: async () => null } as unknown as Request;

    const response = await DELETE(request as never, { params });

    expect(response.status).toBe(400);
    expect(mockDeleteCachedListingContentItem).not.toHaveBeenCalled();
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
      expect.objectContaining({
        subcategory: "open_house",
        timestamp: 1700000001,
        id: 2
      })
    );
  });

  it("returns 401 when user is not authenticated", async () => {
    const { ApiError } = jest.requireMock("@web/src/app/api/v1/_utils");
    mockRequireAuthenticatedUser.mockRejectedValue(
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
    expect(mockDeleteCachedListingContentItem).not.toHaveBeenCalled();
  });
});

export {};
