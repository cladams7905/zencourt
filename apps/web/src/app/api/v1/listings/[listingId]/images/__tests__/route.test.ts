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

describe("listing images route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockGetListingImagesForCurrentUser = jest.fn();
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: TestApiError
    }));
    jest.doMock("@web/src/server/actions/listings/commands", () => ({
      getListingImagesForCurrentUser: (...args: unknown[]) =>
        mockGetListingImagesForCurrentUser(...args)
    }));

    const mod = await import("../route");
    return {
      GET: mod.GET,
      mockGetListingImagesForCurrentUser
    };
  }

  it("returns images on success", async () => {
    const { GET, mockGetListingImagesForCurrentUser } = await loadRoute();
    mockGetListingImagesForCurrentUser.mockResolvedValueOnce([{ id: "img-1" }]);

    const response = await GET({} as Request, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ id: "img-1" }]
    });
    expect(mockGetListingImagesForCurrentUser).toHaveBeenCalledWith("listing-1");
  });

  it("maps ApiError responses", async () => {
    const { GET, mockGetListingImagesForCurrentUser } = await loadRoute();
    mockGetListingImagesForCurrentUser.mockRejectedValueOnce(
      new TestApiError(403, "Forbidden")
    );

    const response = await GET({} as Request, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Forbidden",
      message: "Forbidden"
    });
  });

  it("returns 500 for unexpected errors", async () => {
    const { GET, mockGetListingImagesForCurrentUser } = await loadRoute();
    mockGetListingImagesForCurrentUser.mockRejectedValueOnce(new Error("boom"));

    const response = await GET({} as Request, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INTERNAL_ERROR",
      error: "Failed to fetch listing images"
    });
  });
});
