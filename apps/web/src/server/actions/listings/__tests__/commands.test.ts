/** @jest-environment node */
const mockCreateListing = jest.fn();
const mockUpdateListing = jest.fn();
const mockDeleteCachedListingContentItemService = jest.fn();
const mockGetListingImageUploadUrls = jest.fn();
const mockCreateListingImageRecords = jest.fn();
const mockUpdateListingImageAssignments = jest.fn();
const mockAssignPrimaryListingImageForCategory = jest.fn();
const mockDeleteListingImageUploads = jest.fn();
const mockGetListingImages = jest.fn();
const mockGetOrCreateUserAdditional = jest.fn();
const mockRenderListingTemplateBatchService = jest.fn();
const mockRenderListingTemplateBatchStreamService = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockParseListingSubcategory = jest.fn();
const mockSanitizeCaptionItems = jest.fn();
const mockEncodeSseEvent = jest.fn();
const mockLoggerError = jest.fn();

jest.mock("@web/src/server/models/listings", () => ({
  createListing: (...args: unknown[]) =>
    (mockCreateListing as (...a: unknown[]) => unknown)(...args),
  updateListing: (...args: unknown[]) =>
    (mockUpdateListing as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listingImages", () => ({
  getListingImageUploadUrls: (...args: unknown[]) =>
    (mockGetListingImageUploadUrls as (...a: unknown[]) => unknown)(...args),
  createListingImageRecords: (...args: unknown[]) =>
    (mockCreateListingImageRecords as (...a: unknown[]) => unknown)(...args),
  updateListingImageAssignments: (...args: unknown[]) =>
    (mockUpdateListingImageAssignments as (...a: unknown[]) => unknown)(...args),
  assignPrimaryListingImageForCategory: (...args: unknown[]) =>
    (mockAssignPrimaryListingImageForCategory as (...a: unknown[]) => unknown)(
      ...args
    ),
  deleteListingImageUploads: (...args: unknown[]) =>
    (mockDeleteListingImageUploads as (...a: unknown[]) => unknown)(...args),
  getListingImages: (...args: unknown[]) =>
    (mockGetListingImages as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/cache/listingContent", () => ({
  deleteCachedListingContentItem: (...args: unknown[]) =>
    (mockDeleteCachedListingContentItemService as (...a: unknown[]) => unknown)(
      ...args
    )
}));

jest.mock("@web/src/server/models/userAdditional", () => ({
  getOrCreateUserAdditional: (...args: unknown[]) =>
    (mockGetOrCreateUserAdditional as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/templateRender", () => ({
  renderListingTemplateBatch: (...args: unknown[]) =>
    (mockRenderListingTemplateBatchService as (...a: unknown[]) => unknown)(
      ...args
    ),
  renderListingTemplateBatchStream: (...args: unknown[]) =>
    (mockRenderListingTemplateBatchStreamService as (...a: unknown[]) => unknown)(
      ...args
    )
}));

jest.mock("@web/src/server/services/templateRender/validation", () => ({
  parseListingSubcategory: (value: unknown) =>
    mockParseListingSubcategory(value),
  sanitizeCaptionItems: (value: unknown) => mockSanitizeCaptionItems(value)
}));

jest.mock("@web/src/server/utils/apiAuth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/utils/listingAccess", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/lib/sse/sseEncoder", () => ({
  encodeSseEvent: (payload: unknown) => mockEncodeSseEvent(payload)
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    error: (...args: unknown[]) =>
      (mockLoggerError as (...a: unknown[]) => unknown)(...args)
  })
}));

import { DomainValidationError } from "@web/src/server/errors/domain";
import {
  createListingForCurrentUser,
  updateListingForCurrentUser,
  deleteCachedListingContentItem,
  getListingImageUploadUrlsForCurrentUser,
  createListingImageRecordsForCurrentUser,
  updateListingImageAssignmentsForCurrentUser,
  assignPrimaryListingImageForCategoryForCurrentUser,
  deleteListingImageUploadsForCurrentUser,
  getListingImagesForCurrentUser,
  renderListingTemplateBatch,
  renderListingTemplateBatchStream
} from "@web/src/server/actions/listings/commands";

describe("listings commands", () => {
  const mockUser = { id: "user-1" } as never;
  const mockListing = { id: "listing-1" } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
    mockRequireListingAccess.mockResolvedValue(mockListing);
    mockSanitizeCaptionItems.mockReturnValue([]);
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
      mockDeleteCachedListingContentItemService.mockResolvedValueOnce(undefined);

      await deleteCachedListingContentItem("listing-1", {
        cacheKeyTimestamp: 123,
        cacheKeyId: 456,
        subcategory: "new_listing"
      });

      expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
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
    it("delegates to getListingImageUploadUrls with user id", async () => {
      const files = [{ fileName: "a.jpg" }] as never[];
      mockGetListingImageUploadUrls.mockResolvedValueOnce([{ url: "https://x" }]);

      const result = await getListingImageUploadUrlsForCurrentUser(
        "listing-1",
        files
      );

      expect(mockGetListingImageUploadUrls).toHaveBeenCalledWith(
        "user-1",
        "listing-1",
        files
      );
      expect(result).toEqual([{ url: "https://x" }]);
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
    it("delegates to updateListingImageAssignments with user id", async () => {
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
    it("delegates to deleteListingImageUploads with user id", async () => {
      mockDeleteListingImageUploads.mockResolvedValueOnce(undefined);

      await deleteListingImageUploadsForCurrentUser("listing-1", [
        "https://example.com/1.jpg"
      ]);

      expect(mockDeleteListingImageUploads).toHaveBeenCalledWith(
        "user-1",
        "listing-1",
        ["https://example.com/1.jpg"]
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

  describe("renderListingTemplateBatch", () => {
    it("throws DomainValidationError when subcategory is invalid", async () => {
      mockParseListingSubcategory.mockImplementationOnce(() => {
        throw new Error("A valid listing subcategory is required");
      });

      await expect(
        renderListingTemplateBatch("listing-1", { subcategory: "x" }, "https://site.com")
      ).rejects.toThrow(DomainValidationError);
    });

    it("returns empty items when captionItems sanitize to empty", async () => {
      mockParseListingSubcategory.mockReturnValue("new_listing" as never);

      const result = await renderListingTemplateBatch(
        "listing-1",
        { captionItems: [] },
        "https://site.com"
      );

      expect(result).toEqual({ items: [], failedTemplateIds: [] });
      expect(mockRenderListingTemplateBatchService).not.toHaveBeenCalled();
    });

    it("calls service when subcategory and captionItems are valid", async () => {
      const captionItems = [{ id: "c1", hook: "Hi" }] as never[];
      mockParseListingSubcategory.mockReturnValue("new_listing" as never);
      mockSanitizeCaptionItems.mockReturnValue(captionItems);
      mockGetListingImages.mockResolvedValueOnce([]);
      mockGetOrCreateUserAdditional.mockResolvedValueOnce({} as never);
      mockRenderListingTemplateBatchService.mockResolvedValueOnce({
        items: [{ id: "out-1" }],
        failedTemplateIds: []
      });

      const result = await renderListingTemplateBatch(
        "listing-1",
        { subcategory: "new_listing", captionItems: [{}] },
        "https://site.com"
      );

      expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
      expect(mockRenderListingTemplateBatchService).toHaveBeenCalledWith(
        expect.objectContaining({
          subcategory: "new_listing",
          listing: mockListing,
          captionItems,
          siteOrigin: "https://site.com"
        })
      );
      expect(result).toEqual({
        items: [{ id: "out-1" }],
        failedTemplateIds: []
      });
    });
  });

  describe("renderListingTemplateBatchStream", () => {
    it("throws DomainValidationError when subcategory is invalid", async () => {
      mockParseListingSubcategory.mockImplementationOnce(() => {
        throw new Error("A valid listing subcategory is required");
      });

      await expect(
        renderListingTemplateBatchStream(
          "listing-1",
          { subcategory: "x" },
          "https://site.com"
        )
      ).rejects.toThrow(DomainValidationError);
    });

    it("returns stream with done event when captionItems are empty", async () => {
      mockParseListingSubcategory.mockReturnValue("new_listing" as never);
      mockEncodeSseEvent.mockImplementation(
        (payload: { type: string }) =>
          new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
      );

      const { stream } = await renderListingTemplateBatchStream(
        "listing-1",
        { captionItems: [] },
        "https://site.com"
      );

      const reader = stream.getReader();
      const chunks: string[] = [];
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) chunks.push(new TextDecoder().decode(value));
      }

      expect(mockEncodeSseEvent).toHaveBeenCalledWith({
        type: "done",
        items: [],
        failedTemplateIds: []
      });
      expect(mockRenderListingTemplateBatchStreamService).not.toHaveBeenCalled();
    });

    it("returns stream that calls service and enqueues item and done events", async () => {
      const captionItems = [{ id: "c1" }] as never[];
      mockParseListingSubcategory.mockReturnValue("new_listing" as never);
      mockSanitizeCaptionItems.mockReturnValue(captionItems);
      mockGetListingImages.mockResolvedValueOnce([]);
      mockGetOrCreateUserAdditional.mockResolvedValueOnce({} as never);
      mockEncodeSseEvent.mockImplementation(
        (p: unknown) => new TextEncoder().encode(`data: ${JSON.stringify(p)}\n\n`)
      );
      mockRenderListingTemplateBatchStreamService.mockImplementation(
        async (
          _opts: never,
          callbacks: { onItem: (item: unknown) => Promise<void> }
        ) => {
          await callbacks.onItem({ id: "rendered-1" });
          return { failedTemplateIds: [] };
        }
      );

      const { stream } = await renderListingTemplateBatchStream(
        "listing-1",
        { subcategory: "new_listing", captionItems: [{}] },
        "https://site.com"
      );

      const reader = stream.getReader();
      const chunks: string[] = [];
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) chunks.push(new TextDecoder().decode(value));
      }

      expect(mockRenderListingTemplateBatchStreamService).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-1",
          listingId: "listing-1",
          subcategory: "new_listing",
          captionItems,
          siteOrigin: "https://site.com"
        }),
        expect.any(Object)
      );
      expect(mockEncodeSseEvent).toHaveBeenCalledWith({
        type: "item",
        item: { id: "rendered-1" }
      });
      expect(mockEncodeSseEvent).toHaveBeenCalledWith({
        type: "done",
        failedTemplateIds: []
      });
      expect(chunks.length).toBeGreaterThanOrEqual(2);
    });

    it("enqueues error event when service throws", async () => {
      const captionItems = [{ id: "c1" }] as never[];
      mockParseListingSubcategory.mockReturnValue("new_listing" as never);
      mockSanitizeCaptionItems.mockReturnValue(captionItems);
      mockGetListingImages.mockResolvedValueOnce([]);
      mockGetOrCreateUserAdditional.mockResolvedValueOnce({} as never);
      mockEncodeSseEvent.mockImplementation(
        (p: unknown) => new TextEncoder().encode(`data: ${JSON.stringify(p)}\n\n`)
      );
      mockRenderListingTemplateBatchStreamService.mockRejectedValueOnce(
        new Error("render failed")
      );

      const { stream } = await renderListingTemplateBatchStream(
        "listing-1",
        { subcategory: "new_listing", captionItems: [{}] },
        "https://site.com"
      );

      const reader = stream.getReader();
      const chunks: string[] = [];
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        done = d;
        if (value) chunks.push(new TextDecoder().decode(value));
      }

      expect(mockEncodeSseEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "error",
          message: "render failed"
        })
      );
      expect(mockLoggerError).toHaveBeenCalled();
    });
  });
});
