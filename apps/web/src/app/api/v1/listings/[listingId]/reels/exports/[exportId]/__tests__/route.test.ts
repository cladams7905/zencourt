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

  it("returns not found when the video server responds 404", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ message: "unknown render" })
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

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "NOT_FOUND",
      error: "unknown render",
      message: "unknown render"
    });

    global.fetch = originalFetch;
  });

  it("returns bad gateway for non-404 upstream failures", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ error: "upstream down" })
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
      error: "upstream down",
      message: "upstream down"
    });

    global.fetch = originalFetch;
  });

  it("parses upstream errors from a code field when message/error are empty", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ code: "RENDER_TIMEOUT" })
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
      error: "RENDER_TIMEOUT",
      message: "RENDER_TIMEOUT"
    });

    global.fetch = originalFetch;
  });

  it("marks download ready when artifactReady is true and includes job error text", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        job: {
          status: "failed",
          progress: 1,
          artifactReady: true,
          error: "encode failed"
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
        status: "failed",
        progress: 1,
        downloadReady: true,
        errorMessage: "encode failed"
      }
    });

    global.fetch = originalFetch;
  });

  it("defaults unknown job statuses to queued", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        job: {
          status: "unknown-status",
          progress: NaN
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
        status: "queued",
        progress: 0,
        downloadReady: false
      }
    });

    global.fetch = originalFetch;
  });

  it("maps ApiError from listing access checks", async () => {
    const { GET, mockAssertListingReelExportAccessForCurrentUser } =
      await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockRejectedValueOnce(
      new TestApiError(403, "Not allowed")
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

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Not allowed",
      message: "Not allowed"
    });
  });

  it("maps unexpected errors to INTERNAL_ERROR with message text", async () => {
    const { GET, mockAssertListingReelExportAccessForCurrentUser } =
      await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockRejectedValueOnce(
      new Error("network")
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

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INTERNAL_ERROR",
      error: "network",
      message: "network"
    });
  });
});
