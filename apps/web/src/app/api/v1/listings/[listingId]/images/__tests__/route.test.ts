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

    const mockRequireAuthenticatedUser = jest
      .fn()
      .mockResolvedValue({ id: "user-1" });
    const mockRequireListingAccess = jest.fn().mockResolvedValue({
      id: "listing-1",
      userId: "user-1"
    });
    const mockGetListingImages = jest.fn();
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: TestApiError
    }));
    jest.doMock("@web/src/server/utils/apiAuth", () => ({
      requireAuthenticatedUser: (...args: unknown[]) =>
        mockRequireAuthenticatedUser(...args)
    }));
    jest.doMock("@web/src/server/utils/listingAccess", () => ({
      requireListingAccess: (...args: unknown[]) =>
        mockRequireListingAccess(...args)
    }));
    jest.doMock("@web/src/server/models/listingImages", () => ({
      getListingImages: (...args: unknown[]) => mockGetListingImages(...args)
    }));

    const mod = await import("../route");
    return {
      GET: mod.GET,
      mockGetListingImages
    };
  }

  it("returns images on success", async () => {
    const { GET, mockGetListingImages } = await loadRoute();
    mockGetListingImages.mockResolvedValueOnce([{ id: "img-1" }]);

    const response = await GET({} as Request, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: [{ id: "img-1" }]
    });
    expect(mockGetListingImages).toHaveBeenCalledWith("user-1", "listing-1");
  });

  it("maps ApiError responses", async () => {
    const { GET, mockGetListingImages } = await loadRoute();
    mockGetListingImages.mockRejectedValueOnce(
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
    const { GET, mockGetListingImages } = await loadRoute();
    mockGetListingImages.mockRejectedValueOnce(new Error("boom"));

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
