/** @jest-environment node */

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

const defaultStreamImpl = async (
  _params: unknown,
  opts: { onItem: (item: unknown) => Promise<void> }
) => {
  await opts.onItem({
    templateId: "tpl-1",
    imageUrl: "https://img/1.jpg",
    captionItemId: "cap-1",
    parametersUsed: {}
  });
  return { failedTemplateIds: [] as string[] };
};

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

const mockRequireAuthenticatedUser = jest
  .fn()
  .mockResolvedValue({ id: "user-1" });
const mockRequireListingAccess = jest.fn().mockResolvedValue({
  id: "listing-1",
  title: "Listing"
});
const mockGetListingImages = jest.fn().mockResolvedValue([]);
const mockGetOrCreateUserAdditional = jest.fn().mockResolvedValue({
  socialHandle: null
});

jest.mock("@web/src/app/api/v1/_utils", () => ({
  ApiError: MockApiError,
  requireAuthenticatedUser: (...args: unknown[]) =>
    mockRequireAuthenticatedUser(...args),
  requireListingAccess: (...args: unknown[]) =>
    mockRequireListingAccess(...args)
}));
jest.mock("@web/src/server/actions/db/listingImages", () => ({
  getListingImages: (...args: unknown[]) => mockGetListingImages(...args)
}));
jest.mock("@web/src/server/actions/db/userAdditional", () => ({
  getOrCreateUserAdditional: (...args: unknown[]) =>
    mockGetOrCreateUserAdditional(...args)
}));
const mockRenderListingTemplateBatchStream = jest.fn().mockImplementation(
  async (
    params: unknown,
    opts: { onItem: (item: unknown) => Promise<void> }
  ) => {
    if (streamBehavior.reject !== undefined) {
      throw streamBehavior.reject;
    }
    if (streamBehavior.resolve !== undefined) {
      return streamBehavior.resolve;
    }
    return defaultStreamImpl(params, opts);
  }
);
jest.mock("@web/src/server/services/templateRender", () => ({
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
    mockGetListingImages.mockResolvedValue([]);
    mockGetOrCreateUserAdditional.mockResolvedValue({
      socialHandle: null
    });
    jest.resetModules();
    // Restore real validation so route gets real readJsonBodySafe (previous test may have doMock'd it)
    jest.doMock("@shared/utils/api/validation", () =>
      jest.requireActual("@shared/utils/api/validation")
    );
    // Re-apply templateRender mock so route uses our streamBehavior (previous test may have doMock'd it)
    jest.doMock("@web/src/server/services/templateRender", () => ({
      renderListingTemplateBatchStream: (...args: unknown[]) =>
        mockRenderListingTemplateBatchStream(...args)
    }));

    const routeModule = await import("../route");
    return {
      POST: routeModule.POST,
      mockRenderListingTemplateBatchStream,
      mockGetListingImages,
      mockGetOrCreateUserAdditional
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
    expect(mockRenderListingTemplateBatchStream).not.toHaveBeenCalled();
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
    expect(mockRenderListingTemplateBatchStream).not.toHaveBeenCalled();
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
      expect.objectContaining({
        userId: "user-1",
        listingId: "listing-1",
        subcategory: "new_listing",
        mediaType: "image",
        captionItems: [
          {
            id: "cap-1",
            hook: "Hook",
            caption: "Caption",
            body: [{ header: "Header", content: "Content" }]
          }
        ],
        siteOrigin: "http://localhost:3000"
      }),
      expect.objectContaining({
        onItem: expect.any(Function)
      })
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
      expect.objectContaining({
        templateCount: undefined
      }),
      expect.any(Object)
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
      expect.objectContaining({
        templateCount: 3
      }),
      expect.any(Object)
    );
  });

  it("maps ApiError to status code response", async () => {
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

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: MockApiError,
      requireAuthenticatedUser: jest.fn().mockResolvedValue({ id: "user-1" }),
      requireListingAccess: jest.fn().mockRejectedValue(
        new MockApiError(403, { error: "Forbidden", message: "no access" })
      )
    }));
    jest.doMock("@web/src/server/actions/db/listingImages", () => ({
      getListingImages: jest.fn()
    }));
    jest.doMock("@web/src/server/actions/db/userAdditional", () => ({
      getOrCreateUserAdditional: jest.fn()
    }));
    jest.doMock("@web/src/server/services/templateRender", () => ({
      renderListingTemplateBatchStream: jest.fn()
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { error: jest.fn(), warn: jest.fn() },
      createChildLogger: () => ({ error: jest.fn(), warn: jest.fn() })
    }));

    const routeModule = await import("../route");
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
    });

    const response = await routeModule.POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(403);
  });

  it("returns 500 for unexpected setup errors", async () => {
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

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: MockApiError,
      requireAuthenticatedUser: jest.fn().mockResolvedValue({ id: "user-1" }),
      requireListingAccess: jest.fn().mockResolvedValue({
        id: "listing-1",
        title: "Listing"
      })
    }));
    jest.doMock("@web/src/server/actions/db/listingImages", () => ({
      getListingImages: jest.fn()
    }));
    jest.doMock("@web/src/server/actions/db/userAdditional", () => ({
      getOrCreateUserAdditional: jest.fn()
    }));
    jest.doMock("@web/src/server/services/templateRender", () => ({
      renderListingTemplateBatchStream: jest.fn()
    }));
    jest.doMock("@shared/utils/api/validation", () => ({
      readJsonBodySafe: jest.fn().mockRejectedValue(new Error("body read failed"))
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { error: jest.fn(), warn: jest.fn() },
      createChildLogger: () => ({ error: jest.fn(), warn: jest.fn() })
    }));

    const routeModule = await import("../route");
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
    });

    const response = await routeModule.POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(500);
  });

  it("emits SSE error event when renderListingTemplateBatchStream throws", async () => {
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
    const text = await response.text();
    const events = parseSseEvents(text);

    expect(response.status).toBe(200);
    expect(events.find((e) => e.type === "error")).toEqual({
      type: "error",
      message: "stream render failed"
    });
  });

  it("emits SSE error with generic message when stream throws non-Error", async () => {
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
    const text = await response.text();
    const events = parseSseEvents(text);

    expect(response.status).toBe(200);
    expect(events.find((e) => e.type === "error")).toEqual({
      type: "error",
      message: "Failed to render templates"
    });
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

  it("fetches listing images and user additional before streaming", async () => {
    const {
      POST,
      mockGetListingImages,
      mockGetOrCreateUserAdditional
    } = await loadRoute();
    const request = requestWithBody({
      subcategory: "new_listing",
      captionItems: [
        { id: "cap-1", hook: "Hook", caption: "Caption", body: [] }
      ]
    });

    await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(mockGetListingImages).toHaveBeenCalledWith("user-1", "listing-1");
    expect(mockGetOrCreateUserAdditional).toHaveBeenCalledWith("user-1");
  });
});
