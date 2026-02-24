/** @jest-environment node */

import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";

describe("listing templates render route", () => {
  async function loadRoute() {
    jest.resetModules();

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
    const mockRenderListingTemplateBatch = jest.fn().mockImplementation(
      async (
        _listingId: string,
        body: { captionItems?: unknown[]; subcategory?: string; templateCount?: number },
        _siteOrigin: string
      ) => {
        const sub = body?.subcategory;
        if (!sub || typeof sub !== "string" || !sub.trim()) {
          throw new MockApiError(400, {
            error: "Invalid request",
            message: "A valid listing subcategory is required"
          });
        }
        if (!(LISTING_CONTENT_SUBCATEGORIES as readonly string[]).includes(sub.trim())) {
          throw new MockApiError(400, {
            error: "Invalid request",
            message: "A valid listing subcategory is required"
          });
        }
        const items = Array.isArray(body?.captionItems) && body.captionItems.length > 0
          ? [
              {
                templateId: "tpl-1",
                imageUrl: "https://img/1.jpg",
                captionItemId: "cap-1",
                parametersUsed: {} as Record<string, string>
              }
            ]
          : [];
        return { items, failedTemplateIds: [] };
      }
    );

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

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: MockApiError
    }));
    jest.doMock("@web/src/server/actions/api/listings/templates", () => ({
      renderListingTemplateBatch: (...args: unknown[]) =>
        mockRenderListingTemplateBatch(...args)
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { error: jest.fn(), warn: jest.fn() },
      createChildLogger: () => ({ error: jest.fn(), warn: jest.fn() })
    }));

    const routeModule = await import("../route");
    return {
      POST: routeModule.POST,
      mockRenderListingTemplateBatch
    };
  }

  it("returns 400 for invalid subcategory", async () => {
    const { POST } = await loadRoute();
    const request = {
      json: async () => ({
        subcategory: "bad-subcategory",
        captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
      }),
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(400);
  });

  it("returns 400 when subcategory is missing", async () => {
    const { POST } = await loadRoute();
    const request = {
      json: async () => ({
        captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
      }),
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(400);
  });

  it("returns empty result when caption items sanitize to empty", async () => {
    const { POST, mockRenderListingTemplateBatch } = await loadRoute();
    const request = {
      json: async () => ({
        subcategory: "new_listing",
        captionItems: [{ id: "  ", hook: " ", caption: " ", body: [] }]
      }),
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ failedTemplateIds: [] });
    expect(mockRenderListingTemplateBatch).toHaveBeenCalledTimes(1);
  });

  it("drops non-object and empty caption items", async () => {
    const { POST, mockRenderListingTemplateBatch } = await loadRoute();
    const request = {
      json: async () => ({
        subcategory: "new_listing",
        captionItems: [null, 123, { id: "cap-2", hook: " ", caption: " ", body: [] }]
      }),
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({ failedTemplateIds: [] });
    expect(mockRenderListingTemplateBatch).toHaveBeenCalledTimes(1);
  });

  it("returns empty result when captionItems is not an array", async () => {
    const { POST, mockRenderListingTemplateBatch } = await loadRoute();
    const request = {
      json: async () => ({
        subcategory: "new_listing",
        captionItems: null
      }),
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ items: [], failedTemplateIds: [] });
    expect(mockRenderListingTemplateBatch).toHaveBeenCalledTimes(1);
  });

  it("sanitizes caption items and returns render result", async () => {
    const { POST, mockRenderListingTemplateBatch } = await loadRoute();
    const request = {
      json: async () => ({
        subcategory: "new_listing",
        templateCount: 3,
        captionItems: [
          {
            id: " cap-1 ",
            hook: " Hook ",
            caption: " Caption ",
            body: [
              { header: " Header ", content: " Content " },
              { header: " ", content: " " }
            ]
          }
        ]
      }),
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(200);
    expect(mockRenderListingTemplateBatch).toHaveBeenCalledWith(
      "listing-1",
      expect.objectContaining({
        subcategory: "new_listing",
        templateCount: 3,
        captionItems: expect.any(Array)
      }),
      "http://localhost:3000"
    );
  });

  it("passes undefined templateCount when value is non-positive", async () => {
    const { POST, mockRenderListingTemplateBatch } = await loadRoute();
    const request = {
      json: async () => ({
        subcategory: "new_listing",
        templateCount: 0,
        captionItems: [{ id: "cap-1", hook: "Hook", caption: "Caption", body: [] }]
      }),
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(200);
    expect(mockRenderListingTemplateBatch).toHaveBeenCalledWith(
      "listing-1",
      expect.objectContaining({
        subcategory: "new_listing",
        templateCount: 0,
        captionItems: expect.any(Array)
      }),
      "http://localhost:3000"
    );
  });

  it("maps ApiError to status code response", async () => {
    const { POST, mockRenderListingTemplateBatch } = await loadRoute();
    const { ApiError: MockApiError } = jest.requireMock("@web/src/app/api/v1/_utils");
    mockRenderListingTemplateBatch.mockRejectedValueOnce(
      new MockApiError(403, {
        error: "Forbidden",
        message: "no access"
      })
    );
    const request = {
      json: async () => ({
        subcategory: "new_listing",
        captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
      }),
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(403);
  });

  it("returns 500 for unexpected errors", async () => {
    const { POST, mockRenderListingTemplateBatch } = await loadRoute();
    mockRenderListingTemplateBatch.mockRejectedValueOnce(new Error("boom"));
    const request = {
      json: async () => ({
        subcategory: "new_listing",
        captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
      }),
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(500);
  });

  it("returns 500 for non-Error throws", async () => {
    const { POST, mockRenderListingTemplateBatch } = await loadRoute();
    mockRenderListingTemplateBatch.mockRejectedValueOnce("nope");
    const request = {
      json: async () => ({
        subcategory: "new_listing",
        captionItems: [{ id: "a", hook: "h", caption: "c", body: [] }]
      }),
      nextUrl: { origin: "http://localhost:3000" }
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(response.status).toBe(500);
  });
});
