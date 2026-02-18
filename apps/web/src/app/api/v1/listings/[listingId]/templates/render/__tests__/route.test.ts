/** @jest-environment node */

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
    const mockRenderListingTemplateBatch = jest.fn().mockResolvedValue({
      items: [
        {
          templateId: "tpl-1",
          imageUrl: "https://img/1.jpg",
          captionItemId: "cap-1",
          parametersUsed: {}
        }
      ],
      failedTemplateIds: []
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

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: MockApiError,
      requireAuthenticatedUser: (...args: unknown[]) =>
        mockRequireAuthenticatedUser(...args),
      requireListingAccess: (...args: unknown[]) =>
        mockRequireListingAccess(...args)
    }));
    jest.doMock("@web/src/server/actions/db/listingImages", () => ({
      getListingImages: (...args: unknown[]) => mockGetListingImages(...args)
    }));
    jest.doMock("@web/src/server/actions/db/userAdditional", () => ({
      getOrCreateUserAdditional: (...args: unknown[]) =>
        mockGetOrCreateUserAdditional(...args)
    }));
    jest.doMock("@web/src/server/services/templateRender", () => ({
      renderListingTemplateBatch: (...args: unknown[]) =>
        mockRenderListingTemplateBatch(...args)
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { error: jest.fn(), warn: jest.fn() },
      createChildLogger: () => ({ error: jest.fn(), warn: jest.fn() })
    }));

    const module = await import("../route");
    return {
      POST: module.POST,
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
    expect(payload).toEqual({ items: [], failedTemplateIds: [] });
    expect(mockRenderListingTemplateBatch).not.toHaveBeenCalled();
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
      expect.objectContaining({
        subcategory: "new_listing",
        templateCount: 3,
        captionItems: [
          {
            id: "cap-1",
            hook: "Hook",
            caption: "Caption",
            body: [{ header: "Header", content: "Content" }]
          }
        ]
      })
    );
  });
});
