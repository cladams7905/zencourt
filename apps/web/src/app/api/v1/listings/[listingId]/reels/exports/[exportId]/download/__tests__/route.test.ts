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

describe("reel export artifact download route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockAssertListingReelExportAccessForCurrentUser = jest.fn();
    const mockBuildListingReelExportFilename = jest.fn();

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: TestApiError
    }));
    jest.doMock(
      "@web/src/server/actions/listings/content/reels/export",
      () => ({
        assertListingReelExportAccessForCurrentUser: (...args: unknown[]) =>
          mockAssertListingReelExportAccessForCurrentUser(...args),
        buildListingReelExportFilename: (...args: unknown[]) =>
          mockBuildListingReelExportFilename(...args)
      }),
      { virtual: true }
    );

    const mod = await import("../route");
    return {
      GET: mod.GET,
      mockAssertListingReelExportAccessForCurrentUser,
      mockBuildListingReelExportFilename
    };
  }

  beforeEach(() => {
    process.env.VIDEO_SERVER_URL = "https://video.example.com";
    process.env.VIDEO_SERVER_API_KEY = "test-key";
  });

  it("streams the completed export artifact", async () => {
    const originalFetch = global.fetch;
    const upstreamBody = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4]));
        controller.close();
      }
    });
    const upstreamResponse = new Response(upstreamBody, {
      status: 200,
      headers: new Headers({ "content-type": "video/mp4" })
    });
    const arrayBufferSpy = jest.spyOn(upstreamResponse, "arrayBuffer");
    global.fetch = jest
      .fn()
      .mockResolvedValue(upstreamResponse) as typeof fetch;

    const {
      GET,
      mockAssertListingReelExportAccessForCurrentUser,
      mockBuildListingReelExportFilename
    } = await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockResolvedValueOnce(
      undefined
    );
    mockBuildListingReelExportFilename.mockReturnValueOnce(
      "reel-preview-1.mp4"
    );

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1/download?filenameBase=reel-preview-1"
      ),
      {
        params: Promise.resolve({
          listingId: "listing-1",
          exportId: "export-job-1"
        })
      }
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("video/mp4");
    expect(response.headers.get("Content-Disposition")).toBe(
      'attachment; filename="reel-preview-1.mp4"'
    );
    expect(arrayBufferSpy).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });

  it("forwards Content-Length when the upstream response includes it", async () => {
    const originalFetch = global.fetch;
    const upstreamBody = new ReadableStream();
    global.fetch = jest.fn().mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: new Headers({
          "content-type": "video/mp4",
          "content-length": "4096"
        })
      })
    ) as typeof fetch;

    const {
      GET,
      mockAssertListingReelExportAccessForCurrentUser,
      mockBuildListingReelExportFilename
    } = await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockResolvedValueOnce(
      undefined
    );
    mockBuildListingReelExportFilename.mockReturnValueOnce("out.mp4");

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1/download"
      ),
      {
        params: Promise.resolve({
          listingId: "listing-1",
          exportId: "export-job-1"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Length")).toBe("4096");

    global.fetch = originalFetch;
  });

  it("returns not found when the artifact endpoint responds 404", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ message: "artifact missing" })
    }) as typeof fetch;

    const {
      GET,
      mockAssertListingReelExportAccessForCurrentUser,
      mockBuildListingReelExportFilename
    } = await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockResolvedValueOnce(
      undefined
    );
    mockBuildListingReelExportFilename.mockReturnValueOnce("out.mp4");

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1/download?filenameBase=my-reel"
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
      error: "artifact missing",
      message: "artifact missing"
    });
    expect(mockBuildListingReelExportFilename).toHaveBeenCalledWith("my-reel");

    global.fetch = originalFetch;
  });

  it("maps ApiError from listing access checks", async () => {
    const {
      GET,
      mockAssertListingReelExportAccessForCurrentUser,
      mockBuildListingReelExportFilename
    } = await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockRejectedValueOnce(
      new TestApiError(403, "Forbidden")
    );
    mockBuildListingReelExportFilename.mockReturnValueOnce("out.mp4");

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1/download"
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
      error: "Forbidden",
      message: "Forbidden"
    });
  });

  it("maps unexpected errors to INTERNAL_ERROR", async () => {
    const {
      GET,
      mockAssertListingReelExportAccessForCurrentUser,
      mockBuildListingReelExportFilename
    } = await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockRejectedValueOnce(
      new Error("boom")
    );
    mockBuildListingReelExportFilename.mockReturnValueOnce("out.mp4");

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1/download"
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
      error: "boom",
      message: "boom"
    });
  });

  it("parses upstream JSON errors from the error field when message is absent", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 502,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({ error: "render still running" })
    }) as typeof fetch;

    const {
      GET,
      mockAssertListingReelExportAccessForCurrentUser,
      mockBuildListingReelExportFilename
    } = await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockResolvedValueOnce(
      undefined
    );
    mockBuildListingReelExportFilename.mockReturnValueOnce("out.mp4");

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1/download"
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
      error: "render still running",
      message: "render still running"
    });

    global.fetch = originalFetch;
  });

  it("falls back to a generic message when upstream failure is not JSON", async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      headers: new Headers({ "content-type": "text/plain" }),
      json: async () => {
        throw new Error("not json");
      }
    }) as typeof fetch;

    const {
      GET,
      mockAssertListingReelExportAccessForCurrentUser,
      mockBuildListingReelExportFilename
    } = await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockResolvedValueOnce(
      undefined
    );
    mockBuildListingReelExportFilename.mockReturnValueOnce("out.mp4");

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1/download"
      ),
      {
        params: Promise.resolve({
          listingId: "listing-1",
          exportId: "export-job-1"
        })
      }
    );

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        code: "VIDEO_SERVER_ERROR",
        error: "Failed to download reel export"
      })
    );

    global.fetch = originalFetch;
  });

  it("omits Content-Length when upstream does not send the header", async () => {
    const originalFetch = global.fetch;
    const upstreamBody = new ReadableStream();
    global.fetch = jest.fn().mockResolvedValue(
      new Response(upstreamBody, {
        status: 200,
        headers: new Headers({ "content-type": "video/mp4" })
      })
    ) as typeof fetch;

    const {
      GET,
      mockAssertListingReelExportAccessForCurrentUser,
      mockBuildListingReelExportFilename
    } = await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockResolvedValueOnce(
      undefined
    );
    mockBuildListingReelExportFilename.mockReturnValueOnce("out.mp4");

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1/download?filenameBase=   "
      ),
      {
        params: Promise.resolve({
          listingId: "listing-1",
          exportId: "export-job-1"
        })
      }
    );

    expect(response.status).toBe(200);
    expect(response.headers.has("Content-Length")).toBe(false);
    expect(mockBuildListingReelExportFilename).toHaveBeenCalledWith(undefined);

    global.fetch = originalFetch;
  });

  it("maps non-Error rejections to a generic internal error message", async () => {
    const {
      GET,
      mockAssertListingReelExportAccessForCurrentUser,
      mockBuildListingReelExportFilename
    } = await loadRoute();
    mockAssertListingReelExportAccessForCurrentUser.mockRejectedValueOnce(
      "not-an-error"
    );
    mockBuildListingReelExportFilename.mockReturnValueOnce("out.mp4");

    const response = await GET(
      new Request(
        "http://localhost/api/v1/listings/listing-1/reels/exports/export-job-1/download"
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
      error: "Failed to download reel export",
      message: "Failed to download reel export"
    });
  });
});
