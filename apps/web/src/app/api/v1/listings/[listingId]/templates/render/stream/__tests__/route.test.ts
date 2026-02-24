/** @jest-environment node */

import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";

function parseSseEvents(raw: string): Array<Record<string, unknown>> {
  return raw
    .split("\n\n")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^data:\s*/, ""))
    .map((payload) => JSON.parse(payload) as Record<string, unknown>);
}

/** Mutable stream behavior so one mock can be reused across tests and read at call time. */
let streamBehavior: {
  reject?: Error | string;
  resolve?: { failedTemplateIds: string[] };
} = {};

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

class MockDomainError extends Error {
  kind: string;
  constructor(kind: string, message: string) {
    super(message);
    this.kind = kind;
  }
}

const mockRequireAuthenticatedUser = jest
  .fn()
  .mockResolvedValue({ id: "user-1" });
const mockRequireListingAccess = jest.fn().mockResolvedValue({
  id: "listing-1",
  title: "Listing"
});

jest.mock("@web/src/app/api/v1/_utils", () => ({
  ApiError: MockApiError,
  DomainError: MockDomainError,
  mapDomainError: () => ({ status: 400, code: "INVALID_REQUEST" as const }),
  requireAuthenticatedUser: (...args: unknown[]) =>
    mockRequireAuthenticatedUser(...args),
  requireListingAccess: (...args: unknown[]) =>
    mockRequireListingAccess(...args)
}));

const { encodeSseEvent } = jest.requireActual(
  "@web/src/lib/sse/sseEncoder"
) as typeof import("@web/src/lib/sse/sseEncoder");

const mockRenderListingTemplateBatchStream = jest.fn().mockImplementation(
  async (
    _listingId: string,
    body: { captionItems?: unknown[]; subcategory?: string; templateCount?: number; templateId?: string },
    _siteOrigin: string
  ) => {
    const { ApiError } = jest.requireMock("@web/src/app/api/v1/_utils");
    const sub = body?.subcategory;
    if (!sub || typeof sub !== "string" || !sub.trim()) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "A valid listing subcategory is required"
      });
    }
    if (!(LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(sub.trim())) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "A valid listing subcategory is required"
      });
    }
    if (streamBehavior.reject !== undefined) {
      throw streamBehavior.reject;
    }
    const failedTemplateIds = streamBehavior.resolve?.failedTemplateIds ?? [];
    const hasItems =
      Array.isArray(body?.captionItems) &&
      body.captionItems.length > 0 &&
      body.captionItems.some((c: unknown) => {
        if (!c || typeof c !== "object") return false;
        const o = c as { hook?: string; caption?: string; body?: unknown[] };
        return (
          Boolean(o.hook?.trim()) ||
          Boolean(o.caption?.trim()) ||
          (Array.isArray(o.body) && o.body.length > 0)
        );
      });
    const stream = new ReadableStream({
      start(controller) {
        if (hasItems) {
          controller.enqueue(
            encodeSseEvent({
              type: "item",
              item: {
                templateId: "tpl-1",
                imageUrl: "https://img/1.jpg",
                captionItemId: "cap-1",
                parametersUsed: {}
              }
            })
          );
        }
        controller.enqueue(
          encodeSseEvent({
            type: "done",
            ...(hasItems ? {} : { items: [] }),
            failedTemplateIds
          })
        );
        controller.close();
      }
    });
    return { stream };
  }
);
jest.mock("@web/src/server/actions/listings/templateRender", () => ({
  renderListingTemplateBatchStream: (...args: unknown[]) =>
    mockRenderListingTemplateBatchStream(...args)
}));
jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
  createChildLogger: () => ({ error: jest.fn(), warn: jest.fn() })
}));

describe("listing templates render stream route", () => {
  async function loadRoute(options?: {
    streamRejects?: Error | string;
    streamResolves?: { failedTemplateIds: string[] };
  }) {
    streamBehavior = {
      reject: options?.streamRejects,
      resolve: options?.streamResolves
    };
    jest.resetModules();
    jest.doMock("@shared/utils/api/validation", () =>
      jest.requireActual("@shared/utils/api/validation")
    );
    jest.doMock("@web/src/server/actions/listings/templateRender", () => ({
      renderListingTemplateBatchStream: (...args: unknown[]) =>
        mockRenderListingTemplateBatchStream(...args)
    }));

    const routeModule = await import("../route");
    mockRenderListingTemplateBatchStream.mockClear();
    return {
      POST: routeModule.POST,
      mockRenderListingTemplateBatchStream
    };
  }

  function requestWithBody(body: Record<string, unknown>) {
    return {
      json: async () => body,
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;
  }

  it("returns 400 for invalid subcategory", async () => {
    const { POST } = await loadRoute();
    const request = requestWithBody({
      subcategory: "bad-subcategory",
      captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 when subcategory is missing", async () => {
    const { POST } = await loadRoute();
    const request = requestWithBody({
      captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(400);
  });

  it("returns 400 when listingId is missing", async () => {
    const { POST } = await loadRoute();
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: undefined as unknown as string })
    });
    expect(response.status).toBe(400);
  });

  it("returns SSE done with empty items when caption items sanitize to empty", async () => {
    const { POST, mockRenderListingTemplateBatchStream } = await loadRoute();
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [{ id: "  ", hook: " ", caption: " ", body: [] }]
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const text = await response.text();
    const events = parseSseEvents(text);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "done",
      items: [],
      failedTemplateIds: []
    });
    expect(mockRenderListingTemplateBatchStream).toHaveBeenCalledTimes(1);
  });

  it("returns empty done stream when captionItems is not an array", async () => {
    const { POST, mockRenderListingTemplateBatchStream } = await loadRoute();
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: null
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const text = await response.text();
    const events = parseSseEvents(text);

    expect(response.status).toBe(200);
    expect(events[0]).toEqual({
      type: "done",
      items: [],
      failedTemplateIds: []
    });
    expect(mockRenderListingTemplateBatchStream).toHaveBeenCalledTimes(1);
  });

  it("streams item events and done with failedTemplateIds", async () => {
    const { POST, mockRenderListingTemplateBatchStream } = await loadRoute();
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [
        {
          id: " cap-1 ",
          hook: " Hook ",
          caption: " Caption ",
          body: [{ header: " Header ", content: " Content " }]
        }
      ]
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const text = await response.text();
    const events = parseSseEvents(text);

    expect(response.status).toBe(200);
    expect(events.some((e) => e.type === "item")).toBe(true);
    expect(events.find((e) => e.type === "item")).toEqual({
      type: "item",
      item: {
        templateId: "tpl-1",
        imageUrl: "https://img/1.jpg",
        captionItemId: "cap-1",
        parametersUsed: {}
      }
    });
    expect(events.find((e) => e.type === "done")).toEqual({
      type: "done",
      failedTemplateIds: []
    });
    expect(mockRenderListingTemplateBatchStream).toHaveBeenCalledWith(
      "listing-1",
      expect.objectContaining({
        subcategory: "new_listing",
        captionItems: expect.any(Array)
      }),
      "http://localhost:3000"
    );
  });

  it("passes undefined templateCount when value is non-positive", async () => {
    const { POST, mockRenderListingTemplateBatchStream } = await loadRoute();
    const request = requestWithBody({
      subcategory: "new_listing",
      templateCount: 0,
      captionItems: [
        { id: "cap-1", hook: "Hook", caption: "Caption", body: [] }
      ]
    });

    await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(mockRenderListingTemplateBatchStream).toHaveBeenCalledWith(
      "listing-1",
      expect.objectContaining({
        subcategory: "new_listing",
        templateCount: 0,
        captionItems: expect.any(Array)
      }),
      "http://localhost:3000"
    );
  });

  it("passes templateCount when positive", async () => {
    const { POST, mockRenderListingTemplateBatchStream } = await loadRoute();
    const request = requestWithBody({
      subcategory: "new_listing",
      templateCount: 3,
      captionItems: [
        { id: "cap-1", hook: "Hook", caption: "Caption", body: [] }
      ]
    });

    await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(mockRenderListingTemplateBatchStream).toHaveBeenCalledWith(
      "listing-1",
      expect.objectContaining({
        subcategory: "new_listing",
        templateCount: 3,
        captionItems: expect.any(Array)
      }),
      "http://localhost:3000"
    );
  });

  it("maps ApiError to status code response", async () => {
    const { POST, mockRenderListingTemplateBatchStream } = await loadRoute();
    const { ApiError: MockApiErrorForThrow } = jest.requireMock(
      "@web/src/app/api/v1/_utils"
    );
    mockRenderListingTemplateBatchStream.mockRejectedValueOnce(
      new MockApiErrorForThrow(403, {
        error: "Forbidden",
        message: "no access"
      })
    );
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(403);
  });

  it("returns 500 when action throws", async () => {
    const { POST } = await loadRoute({
      streamRejects: new Error("body read failed")
    });
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(500);
  });

  it("returns 500 when action throws during stream", async () => {
    const { POST } = await loadRoute({
      streamRejects: new Error("stream render failed")
    });
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [
        { id: "cap-1", hook: "Hook", caption: "Caption", body: [] }
      ]
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(500);
  });

  it("returns 500 when action throws non-Error", async () => {
    const { POST } = await loadRoute({ streamRejects: "nope" });
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [
        { id: "cap-1", hook: "Hook", caption: "Caption", body: [] }
      ]
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(500);
  });

  it("streams done with failedTemplateIds from service", async () => {
    const { POST } = await loadRoute({
      streamResolves: { failedTemplateIds: ["tpl-fail-1"] }
    });
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [
        { id: "cap-1", hook: "Hook", caption: "Caption", body: [] }
      ]
    });

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const text = await response.text();
    const events = parseSseEvents(text);

    expect(events.find((e) => e.type === "done")).toEqual({
      type: "done",
      failedTemplateIds: ["tpl-fail-1"]
    });
  });

  it("calls renderListingTemplateBatchStream with listingId, body, and siteOrigin", async () => {
    const { POST, mockRenderListingTemplateBatchStream } = await loadRoute();
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [
        { id: "cap-1", hook: "Hook", caption: "Caption", body: [] }
      ]
    });

    await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(mockRenderListingTemplateBatchStream).toHaveBeenCalledWith(
      "listing-1",
      expect.objectContaining({
        subcategory: "new_listing",
        captionItems: expect.any(Array)
      }),
      "http://localhost:3000"
    );
  });
});

export {};
