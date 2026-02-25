/** @jest-environment node */

describe("listings route", () => {
  async function loadRoute() {
    jest.resetModules();

    const mockGetCurrentUserListingSummariesPage = jest.fn().mockResolvedValue({
      items: [],
      total: 0
    });

    const { ApiError: RealApiError } = jest.requireActual(
      "@web/src/server/errors/api"
    ) as typeof import("@web/src/server/errors/api");
    jest.doMock("@web/src/app/api/v1/_utils", () => ({
      ApiError: RealApiError
    }));
    jest.doMock("@web/src/server/actions/listings/queries", () => ({
      getCurrentUserListingSummariesPage: (...args: unknown[]) =>
        mockGetCurrentUserListingSummariesPage(...args)
    }));

    const rootModule = await import("../route");
    return { GET: rootModule.GET, mockGetCurrentUserListingSummariesPage };
  }

  it("uses default limit/offset when params are missing", async () => {
    const { GET, mockGetCurrentUserListingSummariesPage } = await loadRoute();
    const request = {
      nextUrl: {
        searchParams: { get: () => null }
      }
    } as unknown as Request;

    await GET(request as never);

    expect(mockGetCurrentUserListingSummariesPage).toHaveBeenCalledWith({
      limit: 10,
      offset: 0
    });
  });

  it("parses numeric limit/offset and falls back for invalid values", async () => {
    const { GET, mockGetCurrentUserListingSummariesPage } = await loadRoute();
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

    expect(mockGetCurrentUserListingSummariesPage).toHaveBeenCalledWith({
      limit: 20,
      offset: 0
    });
  });
});
