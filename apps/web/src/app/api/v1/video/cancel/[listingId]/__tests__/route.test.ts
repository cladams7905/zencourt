/** @jest-environment node */

describe("video cancel route", () => {
  async function loadRoute(options?: {
    authApiError?: { status: number; body: { error: string; message: string } };
    authError?: Error;
    listingError?: Error;
    fetchResponse?: { ok: boolean; status?: number; payload?: unknown };
    fetchError?: Error;
  }) {
    jest.resetModules();

    class MockApiError extends Error {
      status: number;
      body: { error: string; message: string };
      constructor(status: number, body: { error: string; message: string }) {
        super(body.message);
        this.status = status;
        this.body = body;
      }
    }

    const mockRequireAuthenticatedUser = jest.fn().mockImplementation(() => {
      if (options?.authApiError) {
        throw new MockApiError(options.authApiError.status, options.authApiError.body);
      }
      if (options?.authError) {
        throw options.authError;
      }
      return Promise.resolve({ id: "user-1" });
    });
    const mockRequireListingAccess = jest.fn().mockImplementation(() => {
      if (options?.listingError) {
        throw options.listingError;
      }
      return Promise.resolve({ id: "listing-1" });
    });
    const mockGetVideoServerConfig = jest.fn().mockReturnValue({
      baseUrl: "https://video.example.com",
      apiKey: "api-key"
    });
    const mockFetch = jest.fn().mockImplementation(async () => {
      if (options?.fetchError) {
        throw options.fetchError;
      }
      return {
        ok: options?.fetchResponse?.ok ?? true,
        status: options?.fetchResponse?.status ?? 200,
        json: async () => options?.fetchResponse?.payload ?? {}
      };
    });
    Object.defineProperty(globalThis, "fetch", {
      writable: true,
      value: mockFetch
    });

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: MockApiError,
      requireAuthenticatedUser: (...args: unknown[]) => mockRequireAuthenticatedUser(...args),
      requireListingAccess: (...args: unknown[]) => mockRequireListingAccess(...args)
    }));
    jest.doMock("@web/src/app/api/v1/video/_config", () => ({
      getVideoServerConfig: (...args: unknown[]) => mockGetVideoServerConfig(...args)
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { info: jest.fn(), error: jest.fn() },
      createChildLogger: () => ({ info: jest.fn(), error: jest.fn() })
    }));

    const routeModule = await import("../route");
    return { POST: routeModule.POST, MockApiError, mockFetch };
  }

  it("returns 400 when listingId is missing", async () => {
    const { POST } = await loadRoute();
    const request = {
      headers: { get: () => "application/json" },
      json: async () => ({ reason: "x" })
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "" })
    });
    expect(response.status).toBe(400);
  });

  it("sends cancel request and returns success payload", async () => {
    const { POST } = await loadRoute({
      fetchResponse: {
        ok: true,
        payload: { canceledVideos: 2, canceledJobs: 5 }
      }
    });
    const request = {
      headers: { get: () => "application/json" },
      json: async () => ({ reason: "user canceled" })
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      listingId: "listing-1",
      canceledVideos: 2,
      canceledJobs: 5
    });
  });

  it("maps upstream failure and falls back reason on bad json", async () => {
    const { POST, mockFetch } = await loadRoute({
      fetchResponse: {
        ok: false,
        status: 502,
        payload: { message: "upstream down" }
      }
    });
    const request = {
      headers: { get: () => "application/json" },
      json: async () => {
        throw new Error("bad json");
      }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toEqual({
      success: false,
      code: "VIDEO_SERVER_ERROR",
      error: "Video server cancel error",
      message: "upstream down"
    });
    expect(mockFetch.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          listingId: "listing-1",
          reason: "Canceled via workflow"
        })
      })
    );
  });

  it("uses default reason when content-type is not json", async () => {
    const { POST, mockFetch } = await loadRoute({
      fetchResponse: { ok: true, payload: {} }
    });
    const request = {
      headers: { get: () => "text/plain" }
    } as unknown as Request;

    await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(mockFetch.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          listingId: "listing-1",
          reason: "Canceled via workflow"
        })
      })
    );
  });

  it("falls back reason when json body has non-string reason", async () => {
    const { POST, mockFetch } = await loadRoute({
      fetchResponse: { ok: true, payload: {} }
    });
    const request = {
      headers: { get: () => "application/json" },
      json: async () => ({ reason: 123 })
    } as unknown as Request;

    await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(mockFetch.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: JSON.stringify({
          listingId: "listing-1",
          reason: "Canceled via workflow"
        })
      })
    );
  });

  it("maps ApiError and unknown errors", async () => {
    const { POST } = await loadRoute({
      authApiError: {
        status: 401,
        body: { error: "Auth", message: "No auth" }
      }
    });
    const request = {
      headers: { get: () => "text/plain" }
    } as unknown as Request;

    const apiErr = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(apiErr.status).toBe(401);

    const { POST: postUnknown } = await loadRoute({
      fetchError: new Error("network")
    });
    const unknownErr = await postUnknown(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(unknownErr.status).toBe(500);
  });

  it("handles upstream json parse failure with fallback message", async () => {
    const { POST } = await loadRoute();
    Object.defineProperty(globalThis, "fetch", {
      writable: true,
      value: jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error("bad json");
        }
      })
    });

    const request = {
      headers: { get: () => "application/json" },
      json: async () => ({ reason: "x" })
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe("Failed to cancel generation");
  });
});
