/** @jest-environment node */

describe("video generate route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockStartListingVideoGeneration = jest.fn().mockImplementation(async (body: unknown) => {
      const b = body as { listingId?: string };
      if (!b?.listingId || typeof b.listingId !== "string") {
        throw new MockApiError(StatusCode.BAD_REQUEST, {
          error: "Invalid request",
          message: "listingId is required"
        });
      }
      return {
        listingId: "listing-1",
        videoId: "video-1",
        jobIds: ["job-1", "job-2"],
        jobCount: 2
      };
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

    class MockDrizzleQueryError extends Error {}

    const StatusCode = { BAD_REQUEST: 400 };

    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: MockApiError
    }));

    jest.doMock("drizzle-orm", () => ({
      DrizzleQueryError: MockDrizzleQueryError
    }));

    jest.doMock("@web/src/server/actions/api/video", () => ({
      startListingVideoGeneration: (...args: unknown[]) =>
        mockStartListingVideoGeneration(...args)
    }));

    jest.doMock("@web/src/lib/core/logging/logger", () => ({
      logger: { error: jest.fn(), info: jest.fn() },
      createChildLogger: () => ({ error: jest.fn(), info: jest.fn() })
    }));

    const routeModule = await import("../route");
    return {
      POST: routeModule.POST,
      MockApiError,
      MockDrizzleQueryError,
      mockStartListingVideoGeneration
    };
  }

  it("returns 202 with video generation payload", async () => {
    const { POST, mockStartListingVideoGeneration } = await loadRoute();
    const request = {
      json: async () => ({
        listingId: "listing-1",
        orientation: "vertical",
        aiDirections: "focus on kitchen"
      })
    } as unknown as Request;

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(202);
    expect(payload).toEqual({
      success: true,
      message: "Video generation started",
      listingId: "listing-1",
      videoId: "video-1",
      jobIds: ["job-1", "job-2"],
      jobCount: 2
    });
    expect(mockStartListingVideoGeneration).toHaveBeenCalledWith(
      expect.objectContaining({
        listingId: "listing-1",
        orientation: "vertical",
        aiDirections: "focus on kitchen"
      })
    );
  });

  it("maps ApiError to route error response", async () => {
    const { POST, MockApiError, mockStartListingVideoGeneration } =
      await loadRoute();
    mockStartListingVideoGeneration.mockRejectedValueOnce(
      new MockApiError(400, {
        error: "Invalid request",
        message: "listing is missing images"
      })
    );
    const request = {
      json: async () => ({ listingId: "listing-1" })
    } as unknown as Request;

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      code: "INVALID_REQUEST",
      error: "listing is missing images",
      success: false,
      listingId: "",
      videoId: "",
      jobIds: [],
      jobCount: 0
    });
  });

  it.each([
    [401, "UNAUTHORIZED", "auth required"],
    [403, "FORBIDDEN", "no access"],
    [404, "NOT_FOUND", "listing missing"]
  ])(
    "maps ApiError status %s to %s",
    async (status, code, message) => {
      const { POST, MockApiError, mockStartListingVideoGeneration } =
        await loadRoute();
      mockStartListingVideoGeneration.mockRejectedValueOnce(
        new MockApiError(status, {
          error: "request failed",
          message
        })
      );
      const request = {
        json: async () => ({ listingId: "listing-1" })
      } as unknown as Request;

      const response = await POST(request as never);
      const payload = await response.json();

      expect(response.status).toBe(status);
      expect(payload).toEqual({
        code,
        error: message,
        success: false,
        listingId: "",
        videoId: "",
        jobIds: [],
        jobCount: 0
      });
    }
  );

  it("returns 400 when listingId is missing from request body", async () => {
    const { POST } = await loadRoute();
    const request = {
      json: async () => ({})
    } as unknown as Request;

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({
      code: "INVALID_REQUEST",
      error: "listingId is required",
      success: false,
      listingId: "",
      videoId: "",
      jobIds: [],
      jobCount: 0
    });
  });

  it("maps DrizzleQueryError to 500", async () => {
    const { POST, MockDrizzleQueryError, mockStartListingVideoGeneration } =
      await loadRoute();
    mockStartListingVideoGeneration.mockRejectedValueOnce(
      new MockDrizzleQueryError("db failed")
    );
    const request = {
      json: async () => ({ listingId: "listing-1" })
    } as unknown as Request;

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      code: "DATABASE_ERROR",
      error: "db failed",
      success: false,
      listingId: "",
      videoId: "",
      jobIds: [],
      jobCount: 0
    });
  });

  it("maps unknown errors to generic 500 response", async () => {
    const { POST, mockStartListingVideoGeneration } = await loadRoute();
    mockStartListingVideoGeneration.mockRejectedValueOnce(new Error("boom"));
    const request = {
      json: async () => ({ listingId: "listing-1" })
    } as unknown as Request;

    const response = await POST(request as never);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual({
      code: "INTERNAL_ERROR",
      error: "boom",
      message: "boom",
      success: false,
      listingId: "",
      videoId: "",
      jobIds: [],
      jobCount: 0
    });
  });
});
