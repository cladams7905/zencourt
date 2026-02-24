/** @jest-environment node */

type MockRedisInstance = {
  get: jest.Mock;
  set: jest.Mock;
};

function makeSseResponse(events: unknown[]): {
  stream: ReadableStream<Uint8Array>;
  status: number;
} {
  const encoder = new TextEncoder();
  const payload = events
    .map((event) => `data: ${JSON.stringify(event)}\n\n`)
    .join("");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    }
  });
  return { stream, status: 200 };
}

function parseSseEvents(raw: string): Array<Record<string, unknown>> {
  return raw
    .split("\n\n")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^data:\s*/, ""))
    .map((payload) => JSON.parse(payload) as Record<string, unknown>);
}

describe("listing content generate route", () => {
  async function loadRoute(options?: {
    cachedItems?: unknown[];
    upstream?: { stream: ReadableStream<Uint8Array>; status: number };
  }) {
    jest.resetModules();
    process.env.KV_REST_API_URL = "https://example.upstash.io";
    process.env.KV_REST_API_TOKEN = "token";

    const mockRequireAuthenticatedUser = jest
      .fn()
      .mockResolvedValue({ id: "user-1" });
    const mockRequireListingAccess = jest.fn().mockResolvedValue({
      id: "listing-1",
      userId: "user-1",
      address: "123 Main St, Austin, TX 78701",
      propertyDetails: null
    });

    const { ApiError: RealApiError } = jest.requireActual(
      "@web/src/server/utils/apiError"
    ) as typeof import("@web/src/server/utils/apiError");
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: RealApiError
    }));

    const mockRedis: MockRedisInstance = {
      get: jest.fn().mockResolvedValue(options?.cachedItems ?? null),
      set: jest.fn().mockResolvedValue(undefined)
    };

    const defaultUpstreamResponse =
      options?.upstream ??
      makeSseResponse([
        {
          type: "done",
          items: [
            {
              hook: "A",
              broll_query: "q",
              body: null,
              cta: null,
              caption: "c"
            }
          ]
        }
      ]);

    jest.doMock("@web/src/server/utils/apiAuth", () => ({
      ApiError: RealApiError,
      requireAuthenticatedUser: (...args: unknown[]) =>
        mockRequireAuthenticatedUser(...args)
    }));
    jest.doMock("@web/src/server/utils/listingAccess", () => ({
      requireListingAccess: (...args: unknown[]) =>
        mockRequireListingAccess(...args)
    }));
    const mockGetCachedListingContent = jest
      .fn()
      .mockResolvedValue(options?.cachedItems ?? null);
    const mockSetCachedListingContent = jest.fn().mockResolvedValue(undefined);
    const mockSetCachedListingContentItem = jest.fn().mockResolvedValue(undefined);
    jest.doMock("@web/src/server/services/cache/listingContent", () => ({
      getCachedListingContent: mockGetCachedListingContent,
      setCachedListingContent: mockSetCachedListingContent,
      setCachedListingContentItem: mockSetCachedListingContentItem,
      buildListingContentCacheKey: jest.fn().mockReturnValue("cache-key")
    }));
    jest.doMock("@web/src/server/services/contentGeneration", () => ({
      runContentGeneration: jest.fn().mockResolvedValue(defaultUpstreamResponse)
    }));
    jest.doMock("@upstash/redis", () => ({
      Redis: class {
        get = mockRedis.get;
        set = mockRedis.set;
      }
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
      createChildLogger: () => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn()
      })
    }));

    const rootModule = await import("../route");
    const contentGeneration = await import(
      "@web/src/server/services/contentGeneration"
    );
    return {
      POST: rootModule.POST,
      mockRedis,
      mockRequireListingAccess,
      mockRequireAuthenticatedUser,
      mockRunContentGeneration: contentGeneration.runContentGeneration as jest.Mock,
      mockGetCachedListingContent,
      mockSetCachedListingContent
    };
  }

  it("returns 400 for invalid subcategory", async () => {
    const { POST } = await loadRoute();
    const request = {
      json: async () => ({
        subcategory: "bad-subcategory",
        media_type: "video"
      }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(400);
  });

  it("returns cached done event when cache has items", async () => {
    const cachedItems = [
      {
        hook: "Cached",
        broll_query: "q",
        body: null,
        cta: null,
        caption: "cap"
      }
    ];
    const { POST, mockRunContentGeneration } = await loadRoute({ cachedItems });
    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "video" }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const text = await response.text();
    const events = parseSseEvents(text);

    expect(response.status).toBe(200);
    expect(events[0]?.type).toBe("done");
    expect((events[0]?.meta as { model: string }).model).toBe("cache");
    expect(mockRunContentGeneration).not.toHaveBeenCalled();
  });

  it("proxies upstream errors as SSE error event", async () => {
    const upstream = makeSseResponse([{ type: "error", message: "upstream failed" }]);
    const { POST } = await loadRoute({
      upstream
    });
    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "video" }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const text = await response.text();
    const events = parseSseEvents(text);

    expect(events[0]).toEqual({ type: "error", message: "upstream failed" });
  });

  it("uses default message when upstream error payload is invalid json", async () => {
    const upstream = {
      status: 500,
      stream: undefined as unknown as ReadableStream<Uint8Array>
    };
    const { POST } = await loadRoute({
      upstream
    });
    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "video" }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const events = parseSseEvents(await response.text());
    expect(events[0]).toEqual({
      type: "error",
      message: "Cannot read properties of undefined (reading 'getReader')"
    });
  });

  it("proxies upstream done and writes cache", async () => {
    const upstream = makeSseResponse([
      { type: "delta", text: "[" },
      {
        type: "done",
        items: [
          { hook: "A", broll_query: "q", body: null, cta: null, caption: "c" }
        ]
      }
    ]);
    const { POST, mockSetCachedListingContent } = await loadRoute({
      upstream
    });
    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "video" }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const text = await response.text();
    const events = parseSseEvents(text);

    expect(events.map((event) => event.type)).toEqual(["delta", "done"]);
    expect((events[1]?.meta as { model: string }).model).toBe("generated");
    expect(mockSetCachedListingContent).toHaveBeenCalled();
  });

  it("returns 400 for invalid media type", async () => {
    const { POST } = await loadRoute();
    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "bad" }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(400);
  });

  it("returns error event when upstream stream body is missing", async () => {
    const upstream = {
      status: 200,
      stream: undefined as unknown as ReadableStream<Uint8Array>
    };
    const { POST } = await loadRoute({
      upstream
    });
    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "video" }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const events = parseSseEvents(await response.text());
    expect(events[0]?.type).toBe("error");
  });

  it("returns error event when upstream done items are missing", async () => {
    const upstream = makeSseResponse([{ type: "delta", text: "[]" }]);
    const { POST } = await loadRoute({
      upstream
    });
    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "video" }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const events = parseSseEvents(await response.text());
    expect(events[1]).toEqual(
      expect.objectContaining({
        type: "error",
        message: "Listing content generation did not return completed items"
      })
    );
  });

  it("proxies upstream error events", async () => {
    const upstream = makeSseResponse([
      { type: "error", message: "upstream event error" }
    ]);
    const { POST } = await loadRoute({
      upstream
    });
    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "video" }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const events = parseSseEvents(await response.text());
    expect(events[0]).toEqual({
      type: "error",
      message: "upstream event error"
    });
  });

  it("returns 500 when content generation throws", async () => {
    const { POST, mockRunContentGeneration } = await loadRoute();
    mockRunContentGeneration.mockRejectedValueOnce(new Error("network down"));
    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "video" }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      code: "INTERNAL_ERROR",
      message: "Failed to generate listing content"
    });
  });

  it("returns 400 when request body is invalid", async () => {
    const { POST } = await loadRoute();
    const request = {
      json: async () => {
        throw new Error("invalid body");
      },
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "INVALID_REQUEST",
      error: "A valid listing subcategory is required",
      message: "A valid listing subcategory is required"
    });
  });
});

export {};
