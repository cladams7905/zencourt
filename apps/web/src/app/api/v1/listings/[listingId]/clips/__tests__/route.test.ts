/** @jest-environment node */
export {};

class TestApiError extends Error {
  status: number;
  body: { message: string };

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.body = { message };
  }
}

describe("listing clips route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockGetListingClipVersionItemsForCurrentUser = jest.fn();
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: TestApiError
    }));
    jest.doMock("@web/src/server/actions/listings/clips", () => ({
      getListingClipVersionItemsForCurrentUser: (...args: unknown[]) =>
        mockGetListingClipVersionItemsForCurrentUser(...args)
    }));

    const mod = await import("../route");
    return {
      GET: mod.GET,
      mockGetListingClipVersionItemsForCurrentUser
    };
  }

  it("returns clip version items for the listing", async () => {
    const { GET, mockGetListingClipVersionItemsForCurrentUser } =
      await loadRoute();
    mockGetListingClipVersionItemsForCurrentUser.mockResolvedValueOnce([
      { clipId: "clip-1" }
    ]);

    const response = await GET({} as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        clipVersionItems: [{ clipId: "clip-1" }]
      }
    });
    expect(mockGetListingClipVersionItemsForCurrentUser).toHaveBeenCalledWith(
      "listing-1"
    );
  });

  it("maps ApiError responses", async () => {
    const { GET, mockGetListingClipVersionItemsForCurrentUser } =
      await loadRoute();
    mockGetListingClipVersionItemsForCurrentUser.mockRejectedValueOnce(
      new TestApiError(404, "Listing not found")
    );

    const response = await GET({} as never, {
      params: Promise.resolve({ listingId: "missing" })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "NOT_FOUND",
      error: "Listing not found",
      message: "Listing not found"
    });
  });
});
