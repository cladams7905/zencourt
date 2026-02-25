/** @jest-environment node */
const mockRenderListingTemplateBatchService = jest.fn();
const mockRenderListingTemplateBatchStreamService = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockParseListingSubcategory = jest.fn();
const mockSanitizeCaptionItems = jest.fn();
const mockEncodeSseEvent = jest.fn();
const mockLoggerError = jest.fn();
const mockGetListingImages = jest.fn();
const mockGetOrCreateUserAdditional = jest.fn();
const mockSetCachedListingContentItem = jest.fn();
const mockGetPublicUrlForStorageUrl = jest.fn((url: string) => url);

jest.mock("@web/src/server/services/templateRender", () => ({
  renderListingTemplateBatch: (...args: unknown[]) =>
    (mockRenderListingTemplateBatchService as (...a: unknown[]) => unknown)(
      ...args
    ),
  renderListingTemplateBatchStream: (...args: unknown[]) =>
    (
      mockRenderListingTemplateBatchStreamService as (
        ...a: unknown[]
      ) => unknown
    )(...args)
}));

jest.mock("@web/src/server/services/templateRender/validation", () => ({
  parseListingSubcategory: (value: unknown) =>
    mockParseListingSubcategory(value),
  sanitizeCaptionItems: (value: unknown) => mockSanitizeCaptionItems(value)
}));

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/lib/sse/sseEncoder", () => ({
  encodeSseEvent: (payload: unknown) => mockEncodeSseEvent(payload)
}));

jest.mock("@web/src/server/models/listingImages", () => ({
  getListingImages: (...args: unknown[]) =>
    (mockGetListingImages as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/userAdditional", () => ({
  getOrCreateUserAdditional: (...args: unknown[]) =>
    (mockGetOrCreateUserAdditional as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/infra/cache/listingContent/cache", () => ({
  setCachedListingContentItem: (...args: unknown[]) =>
    (mockSetCachedListingContentItem as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: {
    getPublicUrlForStorageUrl: (...args: unknown[]) =>
      (mockGetPublicUrlForStorageUrl as (...a: unknown[]) => unknown)(...args)
  }
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    error: (...args: unknown[]) =>
      (mockLoggerError as (...a: unknown[]) => unknown)(...args),
    warn: jest.fn()
  })
}));

import { DomainValidationError } from "@web/src/server/errors/domain";
import {
  renderListingTemplateBatch,
  renderListingTemplateBatchStream
} from "@web/src/server/actions/listings/templateRender/commands";

describe("listing templateRender commands", () => {
  const mockUser = { id: "user-1" } as never;
  const mockListing = { id: "listing-1" } as never;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue(mockUser);
    mockRequireListingAccess.mockResolvedValue(mockListing);
    mockSanitizeCaptionItems.mockReturnValue([]);
    mockGetPublicUrlForStorageUrl.mockImplementation((url: string) => url);
  });

  describe("renderListingTemplateBatch", () => {
    it("throws DomainValidationError when subcategory is invalid", async () => {
      mockParseListingSubcategory.mockImplementationOnce(() => {
        throw new Error("A valid listing subcategory is required");
      });

      await expect(
        renderListingTemplateBatch(
          "listing-1",
          { subcategory: "x" },
          "https://site.com"
        )
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

      expect(mockRequireListingAccess).toHaveBeenCalledWith(
        "listing-1",
        "user-1"
      );
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
      mockEncodeSseEvent.mockImplementation((payload: { type: string }) =>
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
      expect(
        mockRenderListingTemplateBatchStreamService
      ).not.toHaveBeenCalled();
    });

    it("returns stream that calls service and enqueues item and done events", async () => {
      const captionItems = [{ id: "c1" }] as never[];
      mockParseListingSubcategory.mockReturnValue("new_listing" as never);
      mockSanitizeCaptionItems.mockReturnValue(captionItems);
      mockGetListingImages.mockResolvedValueOnce([]);
      mockGetOrCreateUserAdditional.mockResolvedValueOnce({} as never);
      mockEncodeSseEvent.mockImplementation((p: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(p)}\n\n`)
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
      mockEncodeSseEvent.mockImplementation((p: unknown) =>
        new TextEncoder().encode(`data: ${JSON.stringify(p)}\n\n`)
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
      expect(chunks.length).toBeGreaterThan(0);
    });
  });
});
