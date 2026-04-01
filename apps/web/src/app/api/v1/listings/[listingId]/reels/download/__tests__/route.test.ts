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

describe("reel draft download route", () => {
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

  it("streams the rendered reel export on success", async () => {
    const originalFetch = global.fetch;
    const upstreamBody = new ReadableStream();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: upstreamBody,
      headers: new Headers({ "content-type": "video/mp4" })
    }) as typeof fetch;

    const { POST, mockBuildListingReelExportRequestForCurrentUser } =
      await loadRoute();
    mockBuildListingReelExportRequestForCurrentUser.mockResolvedValueOnce({
      filename: "reel-preview-1.mp4",
      request: {
        exportId: "export-1",
        orientation: "vertical",
        clips: [
          {
            src: "https://cdn.example.com/video.mp4",
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      }
    });

    const response = await POST(
      new Request("http://localhost/api/v1/listings/listing-1/reels/download", {
        method: "POST",
        body: JSON.stringify({
          filenameBase: "reel-preview-1",
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
    expect(mockBuildListingReelExportRequestForCurrentUser).toHaveBeenCalledWith(
      "listing-1",
      expect.objectContaining({
        filenameBase: "reel-preview-1"
      })
    );
    expect(global.fetch).toHaveBeenCalledWith(
      "https://video.example.com/renders/reel-export",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "X-API-Key": "test-key"
        })
      })
    );
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reel-preview-1.mp4"'
    );

    global.fetch = originalFetch;
  });

  it("maps ApiError responses", async () => {
    const { POST, mockBuildListingReelExportRequestForCurrentUser } =
      await loadRoute();
    mockBuildListingReelExportRequestForCurrentUser.mockRejectedValueOnce(
      new TestApiError(404, "Reel draft source not found")
    );

    const response = await POST(
      new Request("http://localhost/api/v1/listings/listing-1/reels/download", {
        method: "POST",
        body: JSON.stringify({
          filenameBase: "reel-preview-1",
          segments: []
        })
      }),
      {
        params: Promise.resolve({
          listingId: "listing-1"
        })
      }
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "NOT_FOUND",
      error: "Reel draft source not found",
      message: "Reel draft source not found"
    });
  });

  it("returns bad gateway when the video server export fails", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      body: null,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        message: "Video export failed in the render server."
      })
    }) as typeof fetch;

    const { POST, mockBuildListingReelExportRequestForCurrentUser } =
      await loadRoute();
    mockBuildListingReelExportRequestForCurrentUser.mockResolvedValueOnce({
      filename: "reel-preview-1.mp4",
      request: {
        exportId: "export-1",
        orientation: "vertical",
        clips: [
          {
            src: "https://cdn.example.com/video.mp4",
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      }
    });

    const response = await POST(
      new Request("http://localhost/api/v1/listings/listing-1/reels/download", {
        method: "POST",
        body: JSON.stringify({
          filenameBase: "reel-preview-1",
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

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "VIDEO_SERVER_ERROR",
      error: "Video export failed in the render server.",
      message: "Video export failed in the render server."
    });

    global.fetch = originalFetch;
  });

  it("returns bad gateway when upstream succeeds but omits a response body", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      body: null,
      headers: new Headers({ "content-type": "video/mp4" })
    }) as typeof fetch;

    const { POST, mockBuildListingReelExportRequestForCurrentUser } =
      await loadRoute();
    mockBuildListingReelExportRequestForCurrentUser.mockResolvedValueOnce({
      filename: "reel-preview-1.mp4",
      request: {
        exportId: "export-1",
        orientation: "vertical",
        clips: [
          {
            src: "https://cdn.example.com/video.mp4",
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      }
    });

    const response = await POST(
      new Request("http://localhost/api/v1/listings/listing-1/reels/download", {
        method: "POST",
        body: JSON.stringify({
          filenameBase: "reel-preview-1",
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

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        success: false,
        code: "VIDEO_SERVER_ERROR",
        error: "Failed to download reel preview"
      })
    );

    global.fetch = originalFetch;
  });

  it("uses default error text when upstream failure is not JSON", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      body: null,
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
        clips: [
          {
            src: "https://cdn.example.com/video.mp4",
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      }
    });

    const response = await POST(
      new Request("http://localhost/api/v1/listings/listing-1/reels/download", {
        method: "POST",
        body: JSON.stringify({
          filenameBase: "reel-preview-1",
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
        error: "Failed to download reel preview"
      })
    );

    global.fetch = originalFetch;
  });
});
