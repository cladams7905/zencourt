const mockGetListingVideoStatusService = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();

jest.mock("@web/src/server/services/videoGeneration", () => ({
  getListingVideoStatus: (...args: unknown[]) =>
    (mockGetListingVideoStatusService as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/utils/apiAuth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/utils/listingAccess", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

import { getListingVideoStatus } from "@web/src/server/actions/video/queries";

describe("video queries", () => {
  const mockUser = { id: "user-1" } as never;

  beforeEach(() => {
    mockGetListingVideoStatusService.mockReset();
    mockRequireAuthenticatedUser.mockReset();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
    mockRequireListingAccess.mockReset();
    mockRequireListingAccess.mockResolvedValue(undefined);
  });

  it("returns service result after checking access", async () => {
    const status = { batchId: "b1", jobs: [] };
    mockGetListingVideoStatusService.mockResolvedValueOnce(status);

    const result = await getListingVideoStatus("listing-1");

    expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
    expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
    expect(mockGetListingVideoStatusService).toHaveBeenCalledWith("listing-1");
    expect(result).toEqual(status);
  });
});
