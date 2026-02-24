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

describe("video status route", () => {
  async function loadRoute(options?: {
    statusError?: Error;
    authError?: Error;
    listingAccessError?: Error;
  }) {
    jest.resetModules();

    const mockGetListingVideoStatus = jest.fn().mockImplementation(async () => {
      if (options?.statusError) {
        throw options.statusError;
      }
      if (options?.authError) {
        throw options.authError;
      }
      if (options?.listingAccessError) {
        throw options.listingAccessError;
      }
      return { jobs: [{ id: "job-1" }] };
    });
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: TestApiError
    }));
    jest.doMock("@web/src/server/actions/video", () => ({
      getListingVideoStatus: (...args: unknown[]) =>
        mockGetListingVideoStatus(...args)
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { error: jest.fn() },
      createChildLogger: () => ({ error: jest.fn() })
    }));

    const routeModule = await import("../route");
    return { GET: routeModule.GET };
  }

  it("returns 400 when listingId is missing", async () => {
    const { GET } = await loadRoute();
    const request = {} as unknown as Request;
    const response = await GET(request as never, {
      params: Promise.resolve({ listingId: "" })
    });
    expect(response.status).toBe(400);
  });

  it("returns payload on success", async () => {
    const { GET } = await loadRoute();
    const request = {} as unknown as Request;
    const response = await GET(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      data: { jobs: [{ id: "job-1" }] }
    });
  });

  it("returns 500 when status lookup throws", async () => {
    const { GET } = await loadRoute({ statusError: new Error("boom") });
    const request = {} as unknown as Request;
    const response = await GET(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(500);
  });

  it("uses fallback message for non-Error throws", async () => {
    const { GET } = await loadRoute({ statusError: "bad" as unknown as Error });
    const request = {} as unknown as Request;
    const response = await GET(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe("Failed to load video status");
  });

  it.each([
    [401, "UNAUTHORIZED", "auth required"],
    [403, "FORBIDDEN", "no access"],
    [404, "NOT_FOUND", "listing missing"],
    [400, "INVALID_REQUEST", "bad request"]
  ])(
    "maps ApiError status %s to %s",
    async (status, code, message) => {
      const { GET } = await loadRoute({
        authError: new TestApiError(status, message)
      });
      const request = {} as unknown as Request;
      const response = await GET(request as never, {
        params: Promise.resolve({ listingId: "listing-1" })
      });
      const payload = await response.json();

      expect(response.status).toBe(status);
      expect(payload).toEqual({
        success: false,
        code,
        error: message,
        message
      });
    }
  );
});
