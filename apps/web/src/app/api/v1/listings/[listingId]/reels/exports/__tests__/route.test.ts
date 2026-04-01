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

describe("reel export create route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockBuildListingReelExportRequestForCurrentUser = jest.fn();

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: TestApiError
    }));
    jest.doMock(
      "@web/src/server/actions/listings/content/reels/export",
      () => ({
        buildListingReelExportRequestForCurrentUser: (...args: unknown[]) =>
          mockBuildListingReelExportRequestForCurrentUser(...args)
      }),
      { virtual: true }
    );

    const mod = await import("../route");
    return {
      POST: mod.POST,
      mockBuildListingReelExportRequestForCurrentUser
    };
  }

  beforeEach(() => {
    process.env.VIDEO_SERVER_URL = "https://video.example.com";
    process.env.VIDEO_SERVER_API_KEY = "test-key";
  });

  it("creates a queued reel export job", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, jobId: "export-job-1" })
    }) as typeof fetch;

    const { POST, mockBuildListingReelExportRequestForCurrentUser } =
      await loadRoute();
    mockBuildListingReelExportRequestForCurrentUser.mockResolvedValueOnce({
      filename: "reel-preview-1.mp4",
      request: {
        exportId: "export-job-1",
        orientation: "vertical",
        quality: "premium",
        clips: [
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-1",
            originalVideoUrl: "https://cdn.example.com/video.mp4",
            upscaleUrl: null,
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      }
    });

    const response = await POST(
      new Request("http://localhost/api/v1/listings/listing-1/reels/exports", {
        method: "POST",
        body: JSON.stringify({
          filenameBase: "reel-preview-1",
          quality: "premium",
          segments: [
            {
              sourceType: "listing_clip",
              sourceId: "clip-1",
              durationSeconds: 2.5,
              textOverlay: null,
              supplementalAddressOverlay: null
            }
          ]
        })
      }),
      {
        params: Promise.resolve({
          listingId: "listing-1"
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
    expect(global.fetch).toHaveBeenCalledWith(
      "https://video.example.com/renders/reel-export",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          exportId: "export-job-1",
          orientation: "vertical",
          quality: "premium",
          clips: [
            {
              sourceType: "listing_clip",
              clipVersionId: "clip-version-1",
              originalVideoUrl: "https://cdn.example.com/video.mp4",
              upscaleUrl: null,
              durationSeconds: 2.5,
              textOverlay: null,
              supplementalAddressOverlay: null
            }
          ]
        })
      })
    );

    global.fetch = originalFetch;
  });

  it("uses export id from the request when the video server omits jobId", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    }) as typeof fetch;

    const { POST, mockBuildListingReelExportRequestForCurrentUser } =
      await loadRoute();
    mockBuildListingReelExportRequestForCurrentUser.mockResolvedValueOnce({
      filename: "reel-preview-1.mp4",
      request: {
        exportId: "export-from-request",
        orientation: "vertical",
        quality: "premium",
        clips: []
      }
    });

    const response = await POST(
      new Request("http://localhost/api/v1/listings/listing-1/reels/exports", {
        method: "POST",
        body: JSON.stringify({
          filenameBase: "reel-preview-1",
          quality: "premium",
          segments: []
        })
      }),
      {
        params: Promise.resolve({
          listingId: "listing-1"
        })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: {
        exportId: "export-from-request",
        status: "queued",
        progress: 0,
        downloadReady: false
      }
    });

    global.fetch = originalFetch;
  });

  it("returns bad gateway with upstream JSON message when render start fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ message: "queue full" })
    }) as typeof fetch;

    const { POST, mockBuildListingReelExportRequestForCurrentUser } =
      await loadRoute();
    mockBuildListingReelExportRequestForCurrentUser.mockResolvedValueOnce({
      filename: "reel-preview-1.mp4",
      request: {
        exportId: "export-1",
        orientation: "vertical",
        quality: "premium",
        clips: []
      }
    });

    const response = await POST(
      new Request("http://localhost/api/v1/listings/listing-1/reels/exports", {
        method: "POST",
        body: JSON.stringify({
          filenameBase: "reel-preview-1",
          quality: "premium",
          segments: []
        })
      }),
      {
        params: Promise.resolve({
          listingId: "listing-1"
        })
      }
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "VIDEO_SERVER_ERROR",
      error: "queue full",
      message: "queue full"
    });

    global.fetch = originalFetch;
  });

  it("falls back to a generic message when upstream error is not JSON", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      headers: new Headers({ "content-type": "text/plain" }),
      json: async () => {
        throw new Error("not json");
      }
    }) as typeof fetch;

    const { POST, mockBuildListingReelExportRequestForCurrentUser } =
      await loadRoute();
    mockBuildListingReelExportRequestForCurrentUser.mockResolvedValueOnce({
      filename: "reel-preview-1.mp4",
      request: {
        exportId: "export-1",
        orientation: "vertical",
        quality: "premium",
        clips: []
      }
    });

    const response = await POST(
      new Request("http://localhost/api/v1/listings/listing-1/reels/exports", {
        method: "POST",
        body: JSON.stringify({
          filenameBase: "reel-preview-1",
          quality: "premium",
          segments: []
        })
      }),
      {
        params: Promise.resolve({
          listingId: "listing-1"
        })
      }
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        success: false,
        code: "VIDEO_SERVER_ERROR",
        error: "Failed to start reel export"
      })
    );

    global.fetch = originalFetch;
  });

  it("maps ApiError from export request building", async () => {
    const { POST, mockBuildListingReelExportRequestForCurrentUser } =
      await loadRoute();
    mockBuildListingReelExportRequestForCurrentUser.mockRejectedValueOnce(
      new TestApiError(400, "Invalid segments")
    );

    const response = await POST(
      new Request("http://localhost/api/v1/listings/listing-1/reels/exports", {
        method: "POST",
        body: JSON.stringify({
          filenameBase: "reel-preview-1",
          quality: "premium",
          segments: []
        })
      }),
      {
        params: Promise.resolve({
          listingId: "listing-1"
        })
      }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INVALID_REQUEST",
      error: "Invalid segments",
      message: "Invalid segments"
    });
  });
});
