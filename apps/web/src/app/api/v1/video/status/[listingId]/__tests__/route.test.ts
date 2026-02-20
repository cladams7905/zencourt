/** @jest-environment node */

describe("video status route", () => {
  async function loadRoute(options?: { statusError?: Error }) {
    jest.resetModules();

    const mockRequireAuthenticatedUser = jest
      .fn()
      .mockResolvedValue({ id: "user-1" });
    const mockRequireListingAccess = jest
      .fn()
      .mockResolvedValue({ id: "listing-1" });
    const mockGetListingVideoStatus = jest.fn().mockImplementation(async () => {
      if (options?.statusError) {
        throw options.statusError;
      }
      return { jobs: [{ id: "job-1" }] };
    });
    class MockApiError extends Error {
      status: number;
      body: { message: string };
      constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.body = { message };
      }
    }

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: MockApiError,
      requireAuthenticatedUser: (...args: unknown[]) =>
        mockRequireAuthenticatedUser(...args),
      requireListingAccess: (...args: unknown[]) =>
        mockRequireListingAccess(...args)
    }));
    jest.doMock("@web/src/server/services/videoStatus", () => ({
      getListingVideoStatus: (...args: unknown[]) =>
        mockGetListingVideoStatus(...args)
    }));
    jest.doMock("@shared/utils", () => ({
      createChildLogger: () => ({ error: jest.fn() })
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { error: jest.fn() }
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
});
