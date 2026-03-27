/** @jest-environment node */
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

import {
  getListingImageUploadUrlsForCurrentUser,
  createListingImageRecordsForCurrentUser,
  updateListingImageAssignmentsForCurrentUser,
  assignPrimaryListingImageForCategoryForCurrentUser,
  deleteListingImageUploadsForCurrentUser,
  getListingImagesForCurrentUser
} from "@web/src/server/actions/listings/image";

describe("listings image commands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRequireListingAccess.mockResolvedValue({ id: "listing-1" });
    mockIsManagedStorageUrl.mockReturnValue(true);
  });

  it("prepares upload urls after listing access and existing-image lookup", async () => {
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

    expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
    expect(mockPrepareListingImageUploadUrls).toHaveBeenCalledWith(
      "user-1",
      "listing-1",
      files,
      1
    );
    expect(result).toEqual({ uploads: [{ url: "https://x" }], failed: [] });
  });

  it("updates assignments and deletes managed urls for removed images", async () => {
    mockGetListingImageUrlsByIds.mockResolvedValueOnce([
      "https://example.com/1.jpg",
      "https://external.com/2.jpg"
    ]);

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

  it("delegates pass-through actions to model/storage layers", async () => {
    mockCreateListingImageRecords.mockResolvedValueOnce([{ id: "img-1" }]);
    mockGetListingImages.mockResolvedValueOnce([{ id: "img-1" }]);

    await createListingImageRecordsForCurrentUser("listing-1", [{ key: "k1" }] as never[]);
    await assignPrimaryListingImageForCategoryForCurrentUser(
      "listing-1",
      "living_room"
    );
    await deleteListingImageUploadsForCurrentUser("listing-1", [
      "https://example.com/1.jpg"
    ]);
    const images = await getListingImagesForCurrentUser("listing-1");

    expect(mockCreateListingImageRecords).toHaveBeenCalledWith(
      "user-1",
      "listing-1",
      [{ key: "k1" }]
    );
    expect(mockAssignPrimaryListingImageForCategory).toHaveBeenCalledWith(
      "user-1",
      "listing-1",
      "living_room"
    );
    expect(mockDeleteStorageUrlsOrThrow).toHaveBeenCalledWith(
      ["https://example.com/1.jpg"],
      "Failed to clean up listing uploads."
    );
    expect(images).toEqual([{ id: "img-1" }]);
  });
});
