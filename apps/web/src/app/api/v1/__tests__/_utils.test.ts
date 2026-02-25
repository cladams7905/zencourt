/** @jest-environment node */
export {};

describe("api v1 utils", () => {
  async function loadUtils() {
    jest.resetModules();
    jest.doMock("@web/src/server/actions/_auth/api", () => ({
      requireAuthenticatedUser: jest.fn(),
      requireListingAccess: jest.fn()
    }));
    const mod = await import("../_utils");
    return mod;
  }

  it("builds error responses", async () => {
    const { errorResponse } = await loadUtils();
    const response = errorResponse(400, "Invalid request", "bad input");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid request",
      message: "bad input"
    });
  });

  it("passes through successful handlers", async () => {
    const { withApiErrorHandling } = await loadUtils();
    const { NextResponse } = await import("next/server");
    const response = await withApiErrorHandling(async () =>
      NextResponse.json({ ok: true }, { status: 200 })
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("maps ApiError to response body and status", async () => {
    const { ApiError, withApiErrorHandling } = await loadUtils();
    const response = await withApiErrorHandling(async () => {
      throw new ApiError(403, {
        error: "Forbidden",
        message: "No access"
      });
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Forbidden",
      message: "No access"
    });
  });

  it("maps unknown errors to 500 with fallback message", async () => {
    const { withApiErrorHandling } = await loadUtils();
    const response = await withApiErrorHandling(
      async () => {
        throw new Error("boom");
      },
      "Fallback"
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Internal server error",
      message: "Fallback"
    });
  });

  it("maps DomainError in withApiErrorHandling", async () => {
    const { withApiErrorHandling, DomainError } = await loadUtils();
    const response = await withApiErrorHandling(async () => {
      throw new DomainError("forbidden", "no access");
    });

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "no access",
      message: "no access"
    });
  });

  it.each([
    ["validation", 400, "INVALID_REQUEST"],
    ["unauthorized", 401, "UNAUTHORIZED"],
    ["forbidden", 403, "FORBIDDEN"],
    ["not_found", 404, "NOT_FOUND"],
    ["conflict", 400, "INVALID_REQUEST"],
    ["dependency", 502, "INVALID_REQUEST"],
    ["internal", 500, "INVALID_REQUEST"]
  ] as const)(
    "maps %s domain errors",
    async (kind, expectedStatus, expectedCode) => {
      const { mapDomainError, DomainError } = await loadUtils();
      const mapped = mapDomainError(new DomainError(kind, "message"));
      expect(mapped).toEqual({
        status: expectedStatus,
        code: expectedCode
      });
    }
  );
});
