/** @jest-environment node */

class MockApiError extends Error {
  status: number;
  body: { error: string; message: string };
  constructor(status: number, body: { error: string; message: string }) {
    super(body.message);
    this.status = status;
    this.body = body;
  }
}

describe("video cancel route", () => {
  async function loadRoute(options?: {
    cancelResult?: { success: true; listingId: string; canceledVideos: number; canceledJobs: number };
    cancelError?: Error;
  }) {
    jest.resetModules();

    const mockCancelListingVideoGeneration = jest.fn().mockImplementation(async () => {
      if (options?.cancelError) {
        throw options.cancelError;
      }
      return (
        options?.cancelResult ?? {
          success: true as const,
          listingId: "listing-1",
          canceledVideos: 2,
          canceledJobs: 5
        }
      );
    });

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: MockApiError
    }));
    jest.doMock("@web/src/server/actions/api/video", () => ({
      cancelListingVideoGeneration: (...args: unknown[]) =>
        mockCancelListingVideoGeneration(...args)
    }));
    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { info: jest.fn(), error: jest.fn() },
      createChildLogger: () => ({ info: jest.fn(), error: jest.fn() })
    }));

    const routeModule = await import("../route");
    return {
      POST: routeModule.POST,
      mockCancelListingVideoGeneration
    };
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
      cancelResult: {
        success: true,
        listingId: "listing-1",
        canceledVideos: 2,
        canceledJobs: 5
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

  it("maps ApiError from action to route error response", async () => {
    const { POST } = await loadRoute({
      cancelError: new MockApiError(502, {
        error: "Video server cancel error",
        message: "upstream down"
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

    expect(response.status).toBe(502);
    expect(payload).toMatchObject({
      success: false,
      error: "upstream down",
      message: "upstream down"
    });
  });

  it("uses default reason when content-type is not json", async () => {
    const { POST, mockCancelListingVideoGeneration } = await loadRoute();
    const request = {
      headers: { get: () => "text/plain" }
    } as unknown as Request;

    await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(mockCancelListingVideoGeneration).toHaveBeenCalledWith(
      "listing-1",
      undefined
    );
  });

  it("passes reason when json body has string reason", async () => {
    const { POST, mockCancelListingVideoGeneration } = await loadRoute();
    const request = {
      headers: { get: () => "application/json" },
      json: async () => ({ reason: "user canceled" })
    } as unknown as Request;

    await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });

    expect(mockCancelListingVideoGeneration).toHaveBeenCalledWith(
      "listing-1",
      "user canceled"
    );
  });

  it("maps ApiError and unknown errors", async () => {
    const { POST } = await loadRoute({
      cancelError: new MockApiError(401, {
        error: "Auth",
        message: "No auth"
      })
    });
    const request = {
      headers: { get: () => "text/plain" }
    } as unknown as Request;

    const apiErr = await POST(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(apiErr.status).toBe(401);

    const { POST: postUnknown } = await loadRoute({
      cancelError: new Error("network")
    });
    const unknownErr = await postUnknown(request as never, {
      params: Promise.resolve({ listingId: "listing-1" })
    });
    expect(unknownErr.status).toBe(500);
  });

  it("handles action throw with fallback message", async () => {
    const { POST } = await loadRoute({
      cancelError: new Error("Failed to cancel generation")
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
    expect(payload.message).toBe("Unable to cancel generation");
  });
});
