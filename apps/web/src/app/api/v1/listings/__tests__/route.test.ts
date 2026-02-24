/** @jest-environment node */

describe("listings route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockRequireAuthenticatedUser = jest
      .fn()
      .mockResolvedValue({ id: "user-1" });
    const mockGetUserListingSummariesPage = jest.fn().mockResolvedValue({
      items: [],
      total: 0
    });

    const { ApiError: RealApiError } = jest.requireActual(
      "@web/src/server/utils/apiError"
    ) as typeof import("@web/src/server/utils/apiError");
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: RealApiError
    }));
    jest.doMock("@web/src/server/utils/apiAuth", () => ({
      requireAuthenticatedUser: (...args: unknown[]) =>
        mockRequireAuthenticatedUser(...args)
    }));
    jest.doMock("@web/src/server/models/listings", () => ({
      getUserListingSummariesPage: (...args: unknown[]) =>
        mockGetUserListingSummariesPage(...args)
    }));

    const rootModule = await import("../route");
    return { GET: rootModule.GET, mockGetUserListingSummariesPage };
  }

  it("uses default limit/offset when params are missing", async () => {
    const { GET, mockGetUserListingSummariesPage } = await loadRoute();
    const request = {
      nextUrl: {
        searchParams: { get: () => null }
      }
    } as unknown as Request;

    await GET(request as never);

    expect(mockGetUserListingSummariesPage).toHaveBeenCalledWith("user-1", {
      limit: 10,
      offset: 0
    });
  });

  it("parses numeric limit/offset and falls back for invalid values", async () => {
    const { GET, mockGetUserListingSummariesPage } = await loadRoute();
    const request = {
      nextUrl: {
        searchParams: {
          get: (key: string) => {
            if (key === "limit") return "20";
            if (key === "offset") return "bad";
            return null;
          }
        }
      }
    } as unknown as Request;

    await GET(request as never);

    expect(mockGetUserListingSummariesPage).toHaveBeenCalledWith("user-1", {
      limit: 20,
      offset: 0
    });
  });
});
