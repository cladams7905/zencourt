const mockGetListingById = jest.fn();
const mockUpdateListing = jest.fn();
const mockFetchPropertyDetailsFromService = jest.fn();
const mockBuildPropertyDetailsRevision = jest.fn();
const mockGetDefaultPropertyDetailsProvider = jest.fn();
const mockLoggerInfo = jest.fn();

jest.mock("@web/src/server/actions/db/listings", () => ({
  getListingById: (...args: unknown[]) =>
    (mockGetListingById as (...a: unknown[]) => unknown)(...args),
  updateListing: (...args: unknown[]) =>
    (mockUpdateListing as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/propertyDetails", () => ({
  fetchPropertyDetails: (...args: unknown[]) =>
    (mockFetchPropertyDetailsFromService as (...a: unknown[]) => unknown)(
      ...args
    ),
  buildPropertyDetailsRevision: (...args: unknown[]) =>
    (mockBuildPropertyDetailsRevision as (...a: unknown[]) => unknown)(...args),
  getDefaultPropertyDetailsProvider: () =>
    mockGetDefaultPropertyDetailsProvider()
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    info: (...args: unknown[]) =>
      (mockLoggerInfo as (...a: unknown[]) => unknown)(...args)
  })
}));

import {
  fetchPropertyDetails,
  saveListingPropertyDetails
} from "@web/src/server/actions/api/propertyDetails";

describe("listingProperty actions", () => {
  beforeEach(() => {
    mockGetListingById.mockReset();
    mockUpdateListing.mockReset();
    mockFetchPropertyDetailsFromService.mockReset();
    mockBuildPropertyDetailsRevision.mockReset();
    mockGetDefaultPropertyDetailsProvider.mockReset();
    mockLoggerInfo.mockReset();
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
    mockGetListingById.mockResolvedValueOnce({ id: "l1", address: " " });
    await expect(fetchPropertyDetails("u1", "l1")).rejects.toThrow(
      "Listing address is required to fetch property details"
    );
  });

  it("fetches and saves property details", async () => {
    const details = { address: "123 Main" };
    const mockProvider = { name: "perplexity" };
    mockGetListingById.mockResolvedValueOnce({ id: "l1", address: "123 Main" });
    mockGetDefaultPropertyDetailsProvider.mockReturnValue(mockProvider);
    mockFetchPropertyDetailsFromService.mockResolvedValueOnce(details);
    mockBuildPropertyDetailsRevision.mockReturnValueOnce("rev-1");
    mockUpdateListing.mockResolvedValueOnce({
      id: "l1",
      listingStage: "review"
    });

    const result = await fetchPropertyDetails("u1", "l1");

    expect(result).toEqual({ id: "l1", listingStage: "review" });
    expect(mockFetchPropertyDetailsFromService).toHaveBeenCalledWith(
      "123 Main",
      mockProvider
    );
    expect(mockUpdateListing).toHaveBeenCalledWith(
      "u1",
      "l1",
      expect.objectContaining({
        propertyDetails: details,
        propertyDetailsSource: "perplexity",
        propertyDetailsRevision: "rev-1",
        listingStage: "review"
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
});
