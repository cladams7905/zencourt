/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetListingContentItems = jest.fn();

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args),
  withCurrentUserListingAccess: async (
    listingIdOrResolver: string | ((context: { user: { id: string } }) => string | Promise<string>),
    run: (context: { user: { id: string }; listing: unknown }) => unknown
  ) => {
    const user = await mockRequireAuthenticatedUser();
    const listingId =
      typeof listingIdOrResolver === "function"
        ? await listingIdOrResolver({ user })
        : listingIdOrResolver;
    const listing = await mockRequireListingAccess(listingId, user.id);
    return run({ user, listing });
  }
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/listings/content/items/queries", () => ({
  getListingContentItems: (...args: unknown[]) =>
    (mockGetListingContentItems as (...a: unknown[]) => unknown)(...args)
}));

import { getListingContentItemsForCurrentUser } from "@web/src/server/actions/listings/content/items/actions";

describe("content/items actions", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRequireListingAccess.mockResolvedValue(undefined);
  });

  it("guards and delegates getListingContentItemsForCurrentUser", async () => {
    mockGetListingContentItems.mockResolvedValueOnce({
      items: [{ id: "content-1" }],
      hasMore: false,
      nextOffset: 1
    });

    const result = await getListingContentItemsForCurrentUser("listing-1", {
      mediaTab: "videos",
      subcategory: "new_listing",
      limit: 8,
      offset: 0
    });

    expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
    expect(mockGetListingContentItems).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1",
      mediaTab: "videos",
      subcategory: "new_listing",
      limit: 8,
      offset: 0
    });
    expect(result).toEqual({
      items: [{ id: "content-1" }],
      hasMore: false,
      nextOffset: 1
    });
  });
});
