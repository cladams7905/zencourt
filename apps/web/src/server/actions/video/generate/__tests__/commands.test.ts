const mockStartListingVideoGenerationHelper = jest.fn();
const mockCancelListingVideoGenerationHelper = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetPublicDownloadUrls = jest.fn();

jest.mock("@web/src/server/actions/video/generate/helpers", () => ({
  startListingVideoGeneration: (...args: unknown[]) =>
    (mockStartListingVideoGenerationHelper as (...a: unknown[]) => unknown)(
      ...args
    ),
  cancelListingVideoGeneration: (...args: unknown[]) =>
    (mockCancelListingVideoGenerationHelper as (...a: unknown[]) => unknown)(
      ...args
    )
}));

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/storage/urlResolution", () => ({
  getPublicDownloadUrls: (...args: unknown[]) =>
    (mockGetPublicDownloadUrls as (...a: unknown[]) => unknown)(...args)
}));

import {
  startListingVideoGeneration,
  cancelListingVideoGeneration
} from "@web/src/server/actions/video/generate/commands";

describe("video commands", () => {
  const mockUser = { id: "user-1" } as never;
  const mockListing = { id: "listing-1" } as never;

  beforeEach(() => {
    mockStartListingVideoGenerationHelper.mockReset();
    mockCancelListingVideoGenerationHelper.mockReset();
    mockRequireAuthenticatedUser.mockReset();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
    mockRequireListingAccess.mockReset();
    mockRequireListingAccess.mockResolvedValue(mockListing);
  });

  describe("startListingVideoGeneration", () => {
    it("throws when body has no listingId", async () => {
      await expect(startListingVideoGeneration({})).rejects.toThrow(
        "listingId is required"
      );
      await expect(
        startListingVideoGeneration({ listingId: "" })
      ).rejects.toThrow("listingId is required");
      await expect(
        startListingVideoGeneration({ listingId: 123 })
      ).rejects.toThrow("listingId is required");
    });

    it("trims listingId and passes through to service", async () => {
      mockStartListingVideoGenerationHelper.mockResolvedValueOnce({
        batchId: "b1",
        jobIds: ["j1"]
      });

      const result = await startListingVideoGeneration({
        listingId: "  listing-1  "
      });

      expect(mockRequireListingAccess).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
      expect(mockStartListingVideoGenerationHelper).toHaveBeenCalledWith({
        listingId: "listing-1",
        userId: "user-1",
        orientation: undefined,
        aiDirections: undefined,
        resolvePublicDownloadUrls: expect.any(Function)
      });
      expect(result).toEqual({
        batchId: "b1",
        jobIds: ["j1"],
        listingId: "listing-1"
      });
    });

    it("passes orientation and aiDirections when provided", async () => {
      mockStartListingVideoGenerationHelper.mockResolvedValueOnce({
        batchId: "b1",
        jobIds: []
      });

      await startListingVideoGeneration({
        listingId: "l1",
        orientation: "portrait",
        aiDirections: "sunny day"
      });

      expect(mockStartListingVideoGenerationHelper).toHaveBeenCalledWith({
        listingId: "listing-1",
        userId: "user-1",
        orientation: "portrait",
        aiDirections: "sunny day",
        resolvePublicDownloadUrls: expect.any(Function)
      });
    });
  });

  describe("cancelListingVideoGeneration", () => {
    it("delegates to helper with optional reason", async () => {
      mockCancelListingVideoGenerationHelper.mockResolvedValueOnce(undefined);

      await cancelListingVideoGeneration("listing-1", "user cancelled");

      expect(mockRequireAuthenticatedUser).toHaveBeenCalled();
      expect(mockRequireListingAccess).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
      expect(mockCancelListingVideoGenerationHelper).toHaveBeenCalledWith({
        listingId: "listing-1",
        reason: "user cancelled"
      });
    });

    it("calls helper without reason when not provided", async () => {
      mockCancelListingVideoGenerationHelper.mockResolvedValueOnce(undefined);

      await cancelListingVideoGeneration("listing-1");

      expect(mockCancelListingVideoGenerationHelper).toHaveBeenCalledWith({
        listingId: "listing-1",
        reason: undefined
      });
    });
  });
});
