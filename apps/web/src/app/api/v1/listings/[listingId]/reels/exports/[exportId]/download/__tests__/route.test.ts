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
});
