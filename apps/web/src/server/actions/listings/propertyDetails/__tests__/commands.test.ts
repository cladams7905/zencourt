const mockGetListingById = jest.fn();
const mockUpdateListing = jest.fn();
const mockFetchPropertyDetailsFromService = jest.fn();
const mockBuildPropertyDetailsRevision = jest.fn();
const mockGetDefaultPropertyDetailsProvider = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();

jest.mock("@web/src/server/models/listings", () => ({
  getListingById: (...args: unknown[]) =>
    (mockGetListingById as (...a: unknown[]) => unknown)(...args),
  updateListing: (...args: unknown[]) =>
    (mockUpdateListing as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/propertyDetails", () => ({
  fetchPropertyDetails: (...args: unknown[]) =>
    (mockFetchPropertyDetailsFromService as (...a: unknown[]) => unknown)(...args),
  buildPropertyDetailsRevision: (...args: unknown[]) =>
    (mockBuildPropertyDetailsRevision as (...a: unknown[]) => unknown)(...args),
  getDefaultPropertyDetailsProvider: (...args: unknown[]) =>
    (mockGetDefaultPropertyDetailsProvider as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

import {
  fetchPropertyDetails,
  saveListingPropertyDetails,
  fetchPropertyDetailsForCurrentUser,
  saveListingPropertyDetailsForCurrentUser
} from "@web/src/server/actions/listings/propertyDetails/commands";

describe("listingProperty actions", () => {
  beforeEach(() => {
    mockGetListingById.mockReset();
    mockUpdateListing.mockReset();
    mockFetchPropertyDetailsFromService.mockReset();
    mockBuildPropertyDetailsRevision.mockReset();
    mockGetDefaultPropertyDetailsProvider.mockReset();
    mockRequireAuthenticatedUser.mockReset();
    mockGetDefaultPropertyDetailsProvider.mockReturnValue({
      name: "perplexity",
      fetch: jest.fn()
    });
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
    mockGetListingById.mockResolvedValueOnce(null);
    await expect(fetchPropertyDetails("u1", "l1")).rejects.toThrow(
      "Listing not found"
    );
  });

  it("throws when address is missing", async () => {
    mockGetListingById.mockResolvedValueOnce({
      id: "l1",
      address: null
    });
    await expect(fetchPropertyDetails("u1", "l1")).rejects.toThrow(
      "Listing address is required to fetch property details"
    );
  });

  it("fetches and saves property details", async () => {
    mockGetListingById.mockResolvedValueOnce({
      id: "l1",
      address: "123 Main St"
    });
    const details = { address: "123 Main St", bedrooms: 3 };
    mockFetchPropertyDetailsFromService.mockResolvedValueOnce(details);
    mockBuildPropertyDetailsRevision.mockReturnValueOnce("rev-1");
    mockUpdateListing.mockResolvedValueOnce({ id: "l1", listingStage: "review" });

    const result = await fetchPropertyDetails("u1", "l1");

    expect(result).toEqual({ id: "l1", listingStage: "review" });
    expect(mockGetListingById).toHaveBeenCalledWith("u1", "l1");
    expect(mockFetchPropertyDetailsFromService).toHaveBeenCalledWith(
      "123 Main St",
      expect.objectContaining({ name: "perplexity", fetch: expect.any(Function) })
    );
    expect(mockUpdateListing).toHaveBeenCalledWith(
      "u1",
      "l1",
      expect.objectContaining({
        propertyDetails: details,
        propertyDetailsRevision: "rev-1",
        listingStage: "review",
        propertyDetailsSource: "perplexity"
      })
    );
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
      mockGetListingById.mockResolvedValueOnce({
        id: "l1",
        address: "123 Main St"
      });
      mockFetchPropertyDetailsFromService.mockResolvedValueOnce({
        address: "123 Main St"
      });
      mockBuildPropertyDetailsRevision.mockReturnValueOnce("rev-current");
      mockUpdateListing.mockResolvedValueOnce({ id: "l1" });

      await fetchPropertyDetailsForCurrentUser("l1");

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockGetListingById).toHaveBeenCalledWith("current-user", "l1");
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
