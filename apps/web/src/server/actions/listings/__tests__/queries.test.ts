/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockGetUserListingSummariesPage = jest.fn();
const mockGetListingContentItems = jest.fn();

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings", () => ({
  getUserListingSummariesPage: (...args: unknown[]) =>
    (mockGetUserListingSummariesPage as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/listings/content/items", () => ({
  getListingContentItems: (...args: unknown[]) =>
    (mockGetListingContentItems as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/listings/viewData", () => ({
  getListingCreateViewDataForCurrentUser: jest.fn()
}));

import {
  getCurrentUserListingSummariesPage,
  getListingContentItems
} from "@web/src/server/actions/listings/queries";

describe("listings queries", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetListingContentItems.mockResolvedValue({
      items: [{ id: "content-1" }],
      hasMore: false,
      nextOffset: 1
    });
  });

  it("delegates to getUserListingSummariesPage with current user id", async () => {
    mockGetUserListingSummariesPage.mockResolvedValueOnce({
      rows: [{ id: "listing-1" }],
      total: 1
    });

    const result = await getCurrentUserListingSummariesPage({
      limit: 20,
      offset: 40
    });

    expect(mockGetUserListingSummariesPage).toHaveBeenCalledWith("user-1", {
      limit: 20,
      offset: 40
    });
    expect(result).toEqual({
      rows: [{ id: "listing-1" }],
      total: 1
    });
  });

  it("re-exports getListingContentItems from content/items", async () => {
    const result = await getListingContentItems({
      userId: "user-1",
      listingId: "listing-1",
      mediaTab: "videos",
      subcategory: "new_listing",
      limit: 8,
      offset: 0
    });

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
