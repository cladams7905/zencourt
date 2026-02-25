/** @jest-environment node */

type MockResult = {
  stream: ReadableStream<Uint8Array>;
  status: number;
};

describe("listing content generate route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockGenerateListingContentForCurrentUser = jest.fn<
      Promise<MockResult>,
      [string, unknown]
    >();

    const { ApiError: RealApiError } = jest.requireActual(
      "@web/src/server/errors/api"
    ) as typeof import("@web/src/server/errors/api");

    jest.doMock("@web/src/server/actions/_auth/api", () => ({
      requireAuthenticatedUser: jest.fn()
    }));
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: RealApiError
    }));
    jest.doMock(
      "@web/src/server/actions/listings/content/generate/commands",
      () => ({
        generateListingContentForCurrentUser: (...args: unknown[]) =>
          mockGenerateListingContentForCurrentUser(
            args[0] as string,
            args[1] as unknown
          )
      })
    );
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
      createChildLogger: () => ({
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn()
      })
    }));

    const route = await import("../route");
    return {
      POST: route.POST,
      mockGenerateListingContentForCurrentUser,
      RealApiError
    };
  }

  it("returns 400 when listingId is missing", async () => {
    const { POST } = await loadRoute();
    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "video" })
    } as unknown as Request;

    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "" })
    });

    expect(response.status).toBe(400);
  });

  it("returns stream response from action", async () => {
    const { POST, mockGenerateListingContentForCurrentUser } =
      await loadRoute();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode("data: ok\n\n"));
        controller.close();
      }
    });
    mockGenerateListingContentForCurrentUser.mockResolvedValueOnce({
      stream,
      status: 200
    });

    const body = { subcategory: "new_listing", media_type: "video" };
    const request = { json: async () => body } as unknown as Request;
    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(200);
    expect(mockGenerateListingContentForCurrentUser).toHaveBeenCalledWith(
      "listing-1",
      body
    );
  });

  it("maps ApiError responses from action", async () => {
    const { POST, mockGenerateListingContentForCurrentUser, RealApiError } =
      await loadRoute();
    mockGenerateListingContentForCurrentUser.mockRejectedValueOnce(
      new RealApiError(403, { error: "Forbidden", message: "Forbidden" })
    );

    const request = {
      json: async () => ({ subcategory: "new_listing", media_type: "video" })
    } as unknown as Request;
    const response = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Forbidden",
      message: "Forbidden"
    });
  });
});
