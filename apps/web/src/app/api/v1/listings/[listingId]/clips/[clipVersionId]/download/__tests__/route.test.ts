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

describe("clip version download route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockGetListingClipDownloadForCurrentUser = jest.fn();
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: TestApiError
    }));
    jest.doMock("@web/src/server/actions/listings/create/clips", () => ({
      getListingClipDownloadForCurrentUser: (...args: unknown[]) =>
        mockGetListingClipDownloadForCurrentUser(...args)
    }));

    const mod = await import("../route");
    return {
      GET: mod.GET,
      mockGetListingClipDownloadForCurrentUser
    };
  }

  it("streams the clip download on success", async () => {
    const originalFetch = global.fetch;
    const upstreamBody = new ReadableStream();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: upstreamBody,
      headers: new Headers({ "content-type": "video/mp4" })
    }) as typeof fetch;

    const { GET, mockGetListingClipDownloadForCurrentUser } = await loadRoute();
    mockGetListingClipDownloadForCurrentUser.mockResolvedValueOnce({
      videoUrl: "https://cdn.example.com/video.mp4",
      filename: "kitchen-v2.mp4"
    });

    const response = await GET({} as Request, {
      params: Promise.resolve({
        listingId: "listing-1",
        clipVersionId: "clip-version-2"
      })
    });

    expect(response.status).toBe(200);
    expect(mockGetListingClipDownloadForCurrentUser).toHaveBeenCalledWith(
      "listing-1",
      "clip-version-2"
    );
    expect(global.fetch).toHaveBeenCalledWith("https://cdn.example.com/video.mp4");
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="kitchen-v2.mp4"'
    );

    global.fetch = originalFetch;
  });

  it("maps ApiError responses", async () => {
    const { GET, mockGetListingClipDownloadForCurrentUser } = await loadRoute();
    mockGetListingClipDownloadForCurrentUser.mockRejectedValueOnce(
      new TestApiError(404, "Clip version not found")
    );

    const response = await GET({} as Request, {
      params: Promise.resolve({
        listingId: "listing-1",
        clipVersionId: "missing-version"
      })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "NOT_FOUND",
      error: "Clip version not found",
      message: "Clip version not found"
    });
  });

  it("returns bad gateway when upstream download fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      body: null,
      headers: new Headers()
    }) as typeof fetch;

    const { GET, mockGetListingClipDownloadForCurrentUser } = await loadRoute();
    mockGetListingClipDownloadForCurrentUser.mockResolvedValueOnce({
      videoUrl: "https://cdn.example.com/video.mp4",
      filename: "kitchen-v2.mp4"
    });

    const response = await GET({} as Request, {
      params: Promise.resolve({
        listingId: "listing-1",
        clipVersionId: "clip-version-2"
      })
    });

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "VIDEO_SERVER_ERROR",
      error: "Failed to download clip"
    });

    global.fetch = originalFetch;
  });
});
