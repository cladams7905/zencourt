const mockGetListingById = jest.fn();
const mockUpdateListing = jest.fn();
const mockFetchPropertyDetailsFromService = jest.fn();
const mockFetchAndPersistPropertyDetails = jest.fn();
const mockBuildPropertyDetailsRevision = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();

jest.mock("@web/src/server/models/listings", () => ({
  getListingById: (...args: unknown[]) =>
    (mockGetListingById as (...a: unknown[]) => unknown)(...args),
  updateListing: (...args: unknown[]) =>
    (mockUpdateListing as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/propertyDetails", () => ({
  fetchAndPersistPropertyDetails: (...args: unknown[]) =>
    (mockFetchAndPersistPropertyDetails as (...a: unknown[]) => unknown)(...args),
  fetchPropertyDetails: (...args: unknown[]) =>
    (mockFetchPropertyDetailsFromService as (...a: unknown[]) => unknown)(...args),
  buildPropertyDetailsRevision: (...args: unknown[]) =>
    (mockBuildPropertyDetailsRevision as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/auth/apiAuth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

import {
  fetchPropertyDetails,
  saveListingPropertyDetails,
  fetchPropertyDetailsForCurrentUser,
  saveListingPropertyDetailsForCurrentUser
} from "@web/src/server/actions/propertyDetails/commands";

describe("listingProperty actions", () => {
  beforeEach(() => {
    mockGetListingById.mockReset();
    mockUpdateListing.mockReset();
    mockFetchPropertyDetailsFromService.mockReset();
    mockFetchAndPersistPropertyDetails.mockReset();
    mockBuildPropertyDetailsRevision.mockReset();
    mockRequireAuthenticatedUser.mockReset();
  });

  it("validates required params", async () => {
    await expect(fetchPropertyDetails("", "l1")).rejects.toThrow(
      "User ID is required to fetch listing details"
    );
    await expect(
      saveListingPropertyDetails("u1", "", {} as never)
    ).rejects.toThrow("Listing ID is required to save listing details");
  });

  it("throws when listing does not exist", async () => {
    mockFetchAndPersistPropertyDetails.mockRejectedValueOnce(
      new Error("Listing not found")
    );
    await expect(fetchPropertyDetails("u1", "l1")).rejects.toThrow(
      "Listing not found"
    );
  });

  it("throws when address is missing", async () => {
    mockFetchAndPersistPropertyDetails.mockRejectedValueOnce(
      new Error("Listing address is required to fetch property details")
    );
    await expect(fetchPropertyDetails("u1", "l1")).rejects.toThrow(
      "Listing address is required to fetch property details"
    );
  });

  it("fetches and saves property details", async () => {
    mockFetchAndPersistPropertyDetails.mockResolvedValueOnce({
      id: "l1",
      listingStage: "review"
    });

    const result = await fetchPropertyDetails("u1", "l1");

    expect(result).toEqual({ id: "l1", listingStage: "review" });
    expect(mockFetchAndPersistPropertyDetails).toHaveBeenCalledWith({
      userId: "u1",
      listingId: "l1",
      addressOverride: undefined
    });
  });

  it("saves provided property details", async () => {
    const details = { address: "777 Pine" };
    mockBuildPropertyDetailsRevision.mockReturnValueOnce("rev-2");
    mockUpdateListing.mockResolvedValueOnce({ id: "l1", address: "777 Pine" });

    await expect(
      saveListingPropertyDetails("u1", "l1", details as never)
    ).resolves.toEqual({ id: "l1", address: "777 Pine" });
  });

  describe("ForCurrentUser variants", () => {
    it("fetchPropertyDetailsForCurrentUser delegates with current user id", async () => {
      const mockUser = { id: "current-user" } as never;
      mockRequireAuthenticatedUser.mockResolvedValueOnce(mockUser);
      mockFetchAndPersistPropertyDetails.mockResolvedValueOnce({ id: "l1" });

      await fetchPropertyDetailsForCurrentUser("l1");

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockFetchAndPersistPropertyDetails).toHaveBeenCalledWith({
        userId: "current-user",
        listingId: "l1",
        addressOverride: undefined
      });
    });

    it("saveListingPropertyDetailsForCurrentUser delegates with current user id", async () => {
      const mockUser = { id: "current-user" } as never;
      const details = { address: "999 Elm" } as never;
      mockRequireAuthenticatedUser.mockResolvedValueOnce(mockUser);
      mockBuildPropertyDetailsRevision.mockReturnValueOnce("rev-save");
      mockUpdateListing.mockResolvedValueOnce({ id: "l1" });

      await saveListingPropertyDetailsForCurrentUser("l1", details);

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockUpdateListing).toHaveBeenCalledWith(
        "current-user",
        "l1",
        expect.objectContaining({
          propertyDetails: details,
          propertyDetailsRevision: "rev-save",
          listingStage: "review"
        })
      );
    });
  });
});
