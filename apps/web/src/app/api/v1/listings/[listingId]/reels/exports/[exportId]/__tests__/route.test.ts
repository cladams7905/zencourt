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

describe("reel export status route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockAssertListingReelExportAccessForCurrentUser = jest.fn();

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: TestApiError
    }));
    jest.doMock(
      "@web/src/server/actions/listings/content/reels/export",
      () => ({
        assertListingReelExportAccessForCurrentUser: (...args: unknown[]) =>
          mockAssertListingReelExportAccessForCurrentUser(...args)
      }),
      { virtual: true }
    );

    const mod = await import("../route");
    return {
      GET: mod.GET,
      mockAssertListingReelExportAccessForCurrentUser
    };
  }

  beforeEach(() => {
    process.env.VIDEO_SERVER_URL = "https://video.example.com";
    process.env.VIDEO_SERVER_API_KEY = "test-key";
  });

  it("proxies reel export status", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        job: {
          status: "upscaling",
          progress: 0.42
        }
      })
    }) as typeof fetch;

    const { GET, mockAssertListingReelExportAccessForCurrentUser } =
      await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockResolvedValueOnce(
      undefined
    );

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1"
      ),
      {
        params: Promise.resolve({
          listingId: "listing-1",
          exportId: "export-job-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        exportId: "export-job-1",
        status: "upscaling",
        progress: 0.42,
        downloadReady: false
      }
    });
    expect(
      mockAssertListingReelExportAccessForCurrentUser
    ).toHaveBeenCalledWith("listing-1");

    global.fetch = originalFetch;
  });

  it("returns bad gateway when the video server status payload is invalid", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => null
    }) as typeof fetch;

    const { GET, mockAssertListingReelExportAccessForCurrentUser } =
      await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockResolvedValueOnce(
      undefined
    );

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1"
      ),
      {
        params: Promise.resolve({
          listingId: "listing-1",
          exportId: "export-job-1"
        })
      }
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "VIDEO_SERVER_ERROR",
      error: "Invalid reel export status response from video server",
      message: "Invalid reel export status response from video server"
    });

    global.fetch = originalFetch;
  });
});
