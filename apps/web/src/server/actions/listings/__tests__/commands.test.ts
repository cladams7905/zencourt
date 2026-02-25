/** @jest-environment node */
const mockCreateListing = jest.fn();
const mockUpdateListing = jest.fn();
const mockDeleteCachedListingContentItemService = jest.fn();
const mockPrepareListingImageUploadUrls = jest.fn();
const mockCreateListingImageRecords = jest.fn();
const mockUpdateListingImageAssignments = jest.fn();
const mockAssignPrimaryListingImageForCategory = jest.fn();
const mockGetListingImages = jest.fn();
const mockGetListingImageUrlsByIds = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockDeleteStorageUrlsOrThrow = jest.fn();
const mockIsManagedStorageUrl = jest.fn(() => true);

jest.mock("@web/src/server/models/listings", () => ({
  createListing: (...args: unknown[]) =>
    (mockCreateListing as (...a: unknown[]) => unknown)(...args),
  updateListing: (...args: unknown[]) =>
    (mockUpdateListing as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listingImages", () => ({
  createListingImageRecords: (...args: unknown[]) =>
    (mockCreateListingImageRecords as (...a: unknown[]) => unknown)(...args),
  updateListingImageAssignments: (...args: unknown[]) =>
    (mockUpdateListingImageAssignments as (...a: unknown[]) => unknown)(
      ...args
    ),
  assignPrimaryListingImageForCategory: (...args: unknown[]) =>
    (mockAssignPrimaryListingImageForCategory as (...a: unknown[]) => unknown)(
      ...args
    ),
  getListingImageUrlsByIds: (...args: unknown[]) =>
    (mockGetListingImageUrlsByIds as (...a: unknown[]) => unknown)(...args),
  getListingImages: (...args: unknown[]) =>
    (mockGetListingImages as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/storage/uploadPreparation", () => ({
  prepareListingImageUploadUrls: (...args: unknown[]) =>
    (mockPrepareListingImageUploadUrls as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/shared/storageCleanup", () => ({
  deleteStorageUrlsOrThrow: (...args: unknown[]) =>
    (mockDeleteStorageUrlsOrThrow as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/storage/urlResolution", () => ({
  isManagedStorageUrl: (...args: unknown[]) =>
    (mockIsManagedStorageUrl as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/infra/cache/listingContent", () => ({
  deleteCachedListingContentItem: (...args: unknown[]) =>
    (mockDeleteCachedListingContentItemService as (...a: unknown[]) => unknown)(
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

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    error: jest.fn()
  })
}));

import { DomainValidationError } from "@web/src/server/errors/domain";
import {
  createListingForCurrentUser,
  updateListingForCurrentUser,
  getListingImageUploadUrlsForCurrentUser,
  createListingImageRecordsForCurrentUser,
  updateListingImageAssignmentsForCurrentUser,
  assignPrimaryListingImageForCategoryForCurrentUser,
  deleteListingImageUploadsForCurrentUser,
  getListingImagesForCurrentUser
} from "@web/src/server/actions/listings/commands";
import { deleteCachedListingContentItem } from "@web/src/server/actions/listings/cache";

describe("listings commands", () => {
  const mockUser = { id: "user-1" } as never;
  const mockListing = { id: "listing-1" } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
    mockRequireListingAccess.mockResolvedValue(mockListing);
    mockIsManagedStorageUrl.mockReturnValue(true);
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

  describe("deleteCachedListingContentItem", () => {
    it("throws DomainValidationError when cacheKeyTimestamp is invalid", async () => {
      await expect(
        deleteCachedListingContentItem("listing-1", {
          cacheKeyTimestamp: 0,
          cacheKeyId: 1,
          subcategory: "new_listing"
        })
      ).rejects.toThrow(DomainValidationError);
      await expect(
        deleteCachedListingContentItem("listing-1", {
          cacheKeyTimestamp: NaN,
          cacheKeyId: 1,
          subcategory: "new_listing"
        })
      ).rejects.toThrow(DomainValidationError);
    });

    it("throws DomainValidationError when cacheKeyId is invalid", async () => {
      await expect(
        deleteCachedListingContentItem("listing-1", {
          cacheKeyTimestamp: 1,
          cacheKeyId: 0,
          subcategory: "new_listing"
        })
      ).rejects.toThrow(DomainValidationError);
    });

    it("throws DomainValidationError when subcategory is missing or invalid", async () => {
      await expect(
        deleteCachedListingContentItem("listing-1", {
          cacheKeyTimestamp: 1,
          cacheKeyId: 1,
          subcategory: ""
        })
      ).rejects.toThrow(DomainValidationError);
      await expect(
        deleteCachedListingContentItem("listing-1", {
          cacheKeyTimestamp: 1,
          cacheKeyId: 1,
          subcategory: "invalid_category"
        })
      ).rejects.toThrow(DomainValidationError);
    });

    it("calls deleteCachedListingContentItem service with valid params", async () => {
      mockDeleteCachedListingContentItemService.mockResolvedValueOnce(
        undefined
      );

      await deleteCachedListingContentItem("listing-1", {
        cacheKeyTimestamp: 123,
        cacheKeyId: 456,
        subcategory: "new_listing"
      });

      expect(mockRequireListingAccess).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
      expect(mockDeleteCachedListingContentItemService).toHaveBeenCalledWith({
        userId: "user-1",
        listingId: "listing-1",
        subcategory: "new_listing",
        mediaType: "image",
        timestamp: 123,
        id: 456
      });
    });
  });

  describe("getListingImageUploadUrlsForCurrentUser", () => {
    it("delegates to upload preparation after access + existing images lookup", async () => {
      const files = [{ fileName: "a.jpg" }] as never[];
      mockGetListingImages.mockResolvedValueOnce([{ id: "img-1" }]);
      mockPrepareListingImageUploadUrls.mockResolvedValueOnce({
        uploads: [{ url: "https://x" }],
        failed: []
      });

      const result = await getListingImageUploadUrlsForCurrentUser(
        "listing-1",
        files
      );

      expect(mockRequireListingAccess).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
      expect(mockPrepareListingImageUploadUrls).toHaveBeenCalledWith(
        "user-1",
        "listing-1",
        files,
        1
      );
      expect(result).toEqual({
        uploads: [{ url: "https://x" }],
        failed: []
      });
    });
  });

  describe("createListingImageRecordsForCurrentUser", () => {
    it("delegates to createListingImageRecords with user id", async () => {
      const uploads = [{ key: "k1" }] as never[];
      mockCreateListingImageRecords.mockResolvedValueOnce([{ id: "img-1" }]);

      const result = await createListingImageRecordsForCurrentUser(
        "listing-1",
        uploads
      );

      expect(mockCreateListingImageRecords).toHaveBeenCalledWith(
        "user-1",
        "listing-1",
        uploads
      );
      expect(result).toEqual([{ id: "img-1" }]);
    });
  });

  describe("updateListingImageAssignmentsForCurrentUser", () => {
    it("deletes managed storage URLs after model update", async () => {
      mockGetListingImageUrlsByIds.mockResolvedValueOnce([
        "https://example.com/1.jpg",
        "https://external.com/2.jpg"
      ]);
      mockUpdateListingImageAssignments.mockResolvedValueOnce(undefined);

      await updateListingImageAssignmentsForCurrentUser(
        "listing-1",
        [] as never,
        ["id-1"]
      );

      expect(mockUpdateListingImageAssignments).toHaveBeenCalledWith(
        "user-1",
        "listing-1",
        [],
        ["id-1"]
      );
      expect(mockDeleteStorageUrlsOrThrow).toHaveBeenCalledWith(
        ["https://example.com/1.jpg", "https://external.com/2.jpg"],
        "Failed to delete listing image"
      );
    });
  });

  describe("assignPrimaryListingImageForCategoryForCurrentUser", () => {
    it("delegates to assignPrimaryListingImageForCategory with user id", async () => {
      mockAssignPrimaryListingImageForCategory.mockResolvedValueOnce(undefined);

      await assignPrimaryListingImageForCategoryForCurrentUser(
        "listing-1",
        "living_room"
      );

      expect(mockAssignPrimaryListingImageForCategory).toHaveBeenCalledWith(
        "user-1",
        "listing-1",
        "living_room"
      );
    });
  });

  describe("deleteListingImageUploadsForCurrentUser", () => {
    it("deletes managed URLs after listing access check", async () => {
      await deleteListingImageUploadsForCurrentUser("listing-1", [
        "https://example.com/1.jpg",
        "https://external.com/2.jpg"
      ]);

      expect(mockRequireListingAccess).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
      expect(mockDeleteStorageUrlsOrThrow).toHaveBeenCalledWith(
        ["https://example.com/1.jpg", "https://external.com/2.jpg"],
        "Failed to clean up listing uploads."
      );
    });
  });

  describe("getListingImagesForCurrentUser", () => {
    it("delegates to getListingImages with user id", async () => {
      const images = [{ id: "img-1" }] as never[];
      mockGetListingImages.mockResolvedValueOnce(images);

      const result = await getListingImagesForCurrentUser("listing-1");

      expect(mockGetListingImages).toHaveBeenCalledWith("user-1", "listing-1");
      expect(result).toEqual(images);
    });
  });
});
