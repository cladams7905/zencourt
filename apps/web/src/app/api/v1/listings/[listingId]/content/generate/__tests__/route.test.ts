/** @jest-environment node */

type MockRedisInstance = {
  get: jest.Mock;
  set: jest.Mock;
};

function makeSseResponse(events: unknown[]): Response {
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
  return new Response(stream, { status: 200 });
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
  async function loadRoute(options?: { cachedItems?: unknown[]; upstream?: Response }) {
    jest.resetModules();
    process.env.KV_REST_API_URL = "https://example.upstash.io";
    process.env.KV_REST_API_TOKEN = "token";

    const mockRequireAuthenticatedUser = jest.fn().mockResolvedValue({ id: "user-1" });
    const mockRequireListingAccess = jest.fn().mockResolvedValue({
      id: "listing-1",
      address: "123 Main St, Austin, TX 78701",
      propertyDetails: null
    });

    class MockApiError extends Error {
      status: number;
      body: { error: string; message: string };
      constructor(status: number, body: { error: string; message: string }) {
        super(body.message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
      }
    }

    const mockRedis: MockRedisInstance = {
      get: jest.fn().mockResolvedValue(options?.cachedItems ?? null),
      set: jest.fn().mockResolvedValue(undefined)
    };

    const mockFetch = jest.fn().mockResolvedValue(
      options?.upstream ??
        makeSseResponse([
          {
            type: "done",
            items: [{ hook: "A", broll_query: "q", body: null, cta: null, caption: "c" }]
          }
        ])
    );
    Object.defineProperty(globalThis, "fetch", {
      writable: true,
      value: mockFetch
    });

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: MockApiError,
      requireAuthenticatedUser: (...args: unknown[]) => mockRequireAuthenticatedUser(...args),
      requireListingAccess: (...args: unknown[]) => mockRequireListingAccess(...args)
    }));
    jest.doMock("@upstash/redis", () => ({
      Redis: class {
        get = mockRedis.get;
        set = mockRedis.set;
      }
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { error: jest.fn(), warn: jest.fn() },
      createChildLogger: () => ({ error: jest.fn(), warn: jest.fn() })
    }));

    const module = await import("../route");
    return {
      POST: module.POST,
      mockFetch,
      mockRedis,
      mockRequireListingAccess,
      mockRequireAuthenticatedUser
    };
  }

  it("returns 400 for invalid subcategory", async () => {
    const { POST } = await loadRoute();
    const request = {
      json: async () => ({ subcategory: "bad-subcategory", media_type: "video" }),
      nextUrl: { origin: "http://localhost:3000" },
      headers: { get: () => null }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(400);
  });

  it("returns cached done event when redis has items", async () => {
    const cachedItems = [
      { hook: "Cached", broll_query: "q", body: null, cta: null, caption: "cap" }
    ];
    const { POST, mockFetch } = await loadRoute({ cachedItems });
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
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("proxies upstream errors as SSE error event", async () => {
    const upstream = new Response(JSON.stringify({ message: "upstream failed" }), {
      status: 500
    });
    const { POST } = await loadRoute({ upstream });
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

  it("proxies upstream done and writes cache", async () => {
    const upstream = makeSseResponse([
      { type: "delta", text: "[" },
      {
        type: "done",
        items: [{ hook: "A", broll_query: "q", body: null, cta: null, caption: "c" }]
      }
    ]);
    const { POST, mockRedis } = await loadRoute({ upstream });
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
    expect(mockRedis.set).toHaveBeenCalled();
  });
});
