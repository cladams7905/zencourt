const mockGetUser = jest.fn();
const mockGetOrCreateUserAdditional = jest.fn();
const mockGetUserSidebarListings = jest.fn();

jest.mock("@web/src/server/models/users", () => ({
  getUser: (...args: unknown[]) =>
    (mockGetUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/userAdditional", () => ({
  getOrCreateUserAdditional: (...args: unknown[]) =>
    (mockGetOrCreateUserAdditional as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings", () => ({
  getUserSidebarListings: (...args: unknown[]) =>
    (mockGetUserSidebarListings as (...a: unknown[]) => unknown)(...args)
}));

import { getCurrentUserSidebarData } from "@web/src/server/actions/user/queries";

describe("user queries", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockGetOrCreateUserAdditional.mockReset();
    mockGetUserSidebarListings.mockReset();
  });

  it("returns null when user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce(null);

    const result = await getCurrentUserSidebarData();

    expect(result).toBeNull();
    expect(mockGetOrCreateUserAdditional).not.toHaveBeenCalled();
    expect(mockGetUserSidebarListings).not.toHaveBeenCalled();
  });

  it("returns user, userAdditional, and mapped listings when user exists", async () => {
    const user = { id: "user-1" } as never;
    const userAdditional = { location: "SF" } as never;
    const listings = [
      {
        id: "l1",
        title: "Listing 1",
        listingStage: "review",
        lastOpenedAt: new Date("2025-01-01")
      }
    ] as never[];
    mockGetUser.mockResolvedValueOnce(user);
    mockGetOrCreateUserAdditional.mockResolvedValueOnce(userAdditional);
    mockGetUserSidebarListings.mockResolvedValueOnce(listings);

    const result = await getCurrentUserSidebarData();

    expect(result).toEqual({
      user,
      userAdditional,
      listings: [
        {
          id: "l1",
          title: "Listing 1",
          listingStage: "review",
          lastOpenedAt: new Date("2025-01-01")
        }
      ]
    });
    expect(mockGetOrCreateUserAdditional).toHaveBeenCalledWith("user-1");
    expect(mockGetUserSidebarListings).toHaveBeenCalledWith("user-1");
  });

  it("maps listing fields with null for missing optional fields", async () => {
    const user = { id: "user-1" } as never;
    const userAdditional = {} as never;
    const listings = [
      { id: "l1", title: undefined, listingStage: undefined, lastOpenedAt: null }
    ] as never[];
    mockGetUser.mockResolvedValueOnce(user);
    mockGetOrCreateUserAdditional.mockResolvedValueOnce(userAdditional);
    mockGetUserSidebarListings.mockResolvedValueOnce(listings);

    const result = await getCurrentUserSidebarData();

    expect(result?.listings).toEqual([
      { id: "l1", title: null, listingStage: null, lastOpenedAt: null }
    ]);
  });
});
