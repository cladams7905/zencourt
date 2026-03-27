/** @jest-environment node */
const mockCreateListing = jest.fn();
const mockUpdateListing = jest.fn();
const mockTouchListingActivity = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();

jest.mock("@web/src/server/models/listings", () => ({
  createListing: (...args: unknown[]) =>
    (mockCreateListing as (...a: unknown[]) => unknown)(...args),
  touchListingActivity: (...args: unknown[]) =>
    (mockTouchListingActivity as (...a: unknown[]) => unknown)(...args),
  updateListing: (...args: unknown[]) =>
    (mockUpdateListing as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args),
  withCurrentUser: async (run: (context: { user: { id: string } }) => unknown) =>
    run({ user: await mockRequireAuthenticatedUser() })
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    error: jest.fn()
  })
}));

import {
  createListingForCurrentUser,
  updateListingForCurrentUser,
  touchListingActivityForCurrentUser
} from "@web/src/server/actions/listings/commands";

describe("listings commands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
  });

  describe("createListingForCurrentUser", () => {
    it("delegates to createListing with user id", async () => {
      mockCreateListing.mockResolvedValueOnce({ id: "new-listing" });

      const result = await createListingForCurrentUser();

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockCreateListing).toHaveBeenCalledWith("user-1");
      expect(result).toEqual({ id: "new-listing" });
    });
  });

  describe("updateListingForCurrentUser", () => {
    it("delegates to updateListing with user id", async () => {
      mockUpdateListing.mockResolvedValueOnce({ id: "listing-1" });

      const result = await updateListingForCurrentUser("listing-1", {
        title: "New Title"
      } as never);

      expect(mockUpdateListing).toHaveBeenCalledWith(
        "user-1",
        "listing-1",
        expect.objectContaining({ title: "New Title" })
      );
      expect(result).toEqual({ id: "listing-1" });
    });
  });

  describe("touchListingActivityForCurrentUser", () => {
    it("skips updates when listing was touched recently", async () => {
      mockTouchListingActivity.mockResolvedValueOnce({ touched: false });

      const result = await touchListingActivityForCurrentUser("listing-1");

      expect(mockTouchListingActivity).toHaveBeenCalledWith(
        "user-1",
        "listing-1",
        10
      );
      expect(result).toEqual({ touched: false });
    });

    it("updates lastOpenedAt when listing is stale", async () => {
      mockTouchListingActivity.mockResolvedValueOnce({ touched: true });

      const result = await touchListingActivityForCurrentUser("listing-1");

      expect(mockTouchListingActivity).toHaveBeenCalledWith(
        "user-1",
        "listing-1",
        10
      );
      expect(result).toEqual({ touched: true });
    });
  });

});
