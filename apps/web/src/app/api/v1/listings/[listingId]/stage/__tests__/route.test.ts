/** @jest-environment node */
export {};

class TestApiError extends Error {
  status: number;
  body: { message: string };

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.body = { message };
  }
}

describe("listing stage route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockUpdateListingForCurrentUser = jest.fn();
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: TestApiError
    }));
    jest.doMock("@web/src/server/actions/listings/commands", () => ({
      updateListingForCurrentUser: (...args: unknown[]) =>
        mockUpdateListingForCurrentUser(...args)
    }));

    const mod = await import("../route");
    return {
      POST: mod.POST,
      mockUpdateListingForCurrentUser
    };
  }

  it("updates listing stage on success", async () => {
    const { POST, mockUpdateListingForCurrentUser } = await loadRoute();
    mockUpdateListingForCurrentUser.mockResolvedValueOnce(undefined);

    const response = await POST(
      new Request("http://localhost/api/v1/listings/l1/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingStage: "categorize" })
      }) as never,
      { params: Promise.resolve({ listingId: "l1" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      data: { listingId: "l1", listingStage: "categorize" }
    });
    expect(mockUpdateListingForCurrentUser).toHaveBeenCalledWith("l1", {
      listingStage: "categorize"
    });
  });

  it("returns 400 for invalid stage", async () => {
    const { POST, mockUpdateListingForCurrentUser } = await loadRoute();

    const response = await POST(
      new Request("http://localhost/api/v1/listings/l1/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingStage: "invalid" })
      }) as never,
      { params: Promise.resolve({ listingId: "l1" }) }
    );

    expect(response.status).toBe(400);
    expect(mockUpdateListingForCurrentUser).not.toHaveBeenCalled();
  });

  it("maps ApiError responses", async () => {
    const { POST, mockUpdateListingForCurrentUser } = await loadRoute();
    mockUpdateListingForCurrentUser.mockRejectedValueOnce(
      new TestApiError(403, "Forbidden")
    );

    const response = await POST(
      new Request("http://localhost/api/v1/listings/l1/stage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingStage: "review" })
      }) as never,
      { params: Promise.resolve({ listingId: "l1" }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      success: false,
      code: "FORBIDDEN",
      error: "Forbidden",
      message: "Forbidden"
    });
  });
});
