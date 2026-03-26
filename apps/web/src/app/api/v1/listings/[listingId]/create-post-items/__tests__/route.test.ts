/** @jest-environment node */
export {};

import { URL as NodeURL } from "node:url";

class TestApiError extends Error {
  status: number;
  body: { message: string };

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.body = { message };
  }
}

describe("listing create post items route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockGetListingCreatePostItemsForCurrentUser = jest.fn();
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: TestApiError
    }));
    jest.doMock("@web/src/server/actions/listings/createPostItems", () => ({
      getListingCreatePostItemsForCurrentUser: (...args: unknown[]) =>
        mockGetListingCreatePostItemsForCurrentUser(...args)
    }));

    const mod = await import("../route");
    return {
      GET: mod.GET,
      mockGetListingCreatePostItemsForCurrentUser
    };
  }

  it("returns paged create post items", async () => {
    const { GET, mockGetListingCreatePostItemsForCurrentUser } = await loadRoute();
    mockGetListingCreatePostItemsForCurrentUser.mockResolvedValueOnce({
      items: [{ id: "item-1" }],
      hasMore: true,
      nextOffset: 8
    });

    const response = await GET(
      {
        nextUrl: new NodeURL(
          "https://example.com/api/v1/listings/listing-1/create-post-items?mediaTab=videos&subcategory=new_listing&limit=8&offset=0"
        )
      } as never,
      {
      params: Promise.resolve({ listingId: "listing-1" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        items: [{ id: "item-1" }],
        hasMore: true,
        nextOffset: 8
      }
    });
    expect(mockGetListingCreatePostItemsForCurrentUser).toHaveBeenCalledWith(
      "listing-1",
      {
        mediaTab: "videos",
        subcategory: "new_listing",
        limit: 8,
        offset: 0
      }
    );
  });

  it("clamps invalid pagination params at the route boundary", async () => {
    const { GET, mockGetListingCreatePostItemsForCurrentUser } = await loadRoute();
    mockGetListingCreatePostItemsForCurrentUser.mockResolvedValueOnce({
      items: [],
      hasMore: false,
      nextOffset: 0
    });

    await GET(
      {
        nextUrl: new NodeURL(
          "https://example.com/api/v1/listings/listing-1/create-post-items?mediaTab=videos&subcategory=new_listing&limit=999&offset=-12"
        )
      } as never,
      {
        params: Promise.resolve({ listingId: "listing-1" })
      }
    );

    expect(mockGetListingCreatePostItemsForCurrentUser).toHaveBeenCalledWith(
      "listing-1",
      expect.objectContaining({
        limit: 8,
        offset: 0
      })
    );
  });
});
