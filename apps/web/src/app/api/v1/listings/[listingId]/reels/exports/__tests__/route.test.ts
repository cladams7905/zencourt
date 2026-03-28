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
      new Request("http://localhost/api/v1/listings/listing-1/reels/exports", {
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
});
