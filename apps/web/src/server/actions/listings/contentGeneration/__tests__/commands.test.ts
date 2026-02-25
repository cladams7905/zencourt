/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetCachedListingContent = jest.fn();
const mockSetCachedListingContent = jest.fn();
const mockSetCachedListingContentItem = jest.fn();
const mockRunContentGeneration = jest.fn();
const mockParseAndValidateParams = jest.fn();
const mockResolveListingContext = jest.fn();
const mockBuildUpstreamRequestBody = jest.fn();
const mockEncodeSseEvent = jest.fn();
const mockConsumeSseStream = jest.fn();

jest.mock("@web/src/server/auth/apiAuth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/cache/listingContent", () => ({
  getCachedListingContent: (...args: unknown[]) =>
    (mockGetCachedListingContent as (...a: unknown[]) => unknown)(...args),
  setCachedListingContent: (...args: unknown[]) =>
    (mockSetCachedListingContent as (...a: unknown[]) => unknown)(...args),
  setCachedListingContentItem: (...args: unknown[]) =>
    (mockSetCachedListingContentItem as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/contentGeneration/helpers", () => ({
  runContentGenerationForUser: (...args: unknown[]) =>
    (mockRunContentGeneration as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/listings/contentGeneration/helpers", () => ({
  parseAndValidateParams: (...args: unknown[]) =>
    (mockParseAndValidateParams as (...a: unknown[]) => unknown)(...args),
  resolveListingContext: (...args: unknown[]) =>
    (mockResolveListingContext as (...a: unknown[]) => unknown)(...args),
  buildUpstreamRequestBody: (...args: unknown[]) =>
    (mockBuildUpstreamRequestBody as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/lib/sse/sseEncoder", () => ({
  encodeSseEvent: (...args: unknown[]) =>
    (mockEncodeSseEvent as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/lib/sse/sseEventStream", () => ({
  consumeSseStream: (...args: unknown[]) =>
    (mockConsumeSseStream as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn()
  })
}));

import { generateListingContentForCurrentUser } from "@web/src/server/actions/listings/contentGeneration/commands";

describe("contentGeneration/commands", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRequireListingAccess.mockResolvedValue({
      id: "listing-1",
      userId: "user-1"
    });
    mockParseAndValidateParams.mockReturnValue({
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "image",
      focus: "",
      notes: "",
      generationNonce: "",
      generationCount: 1,
      templateId: "tpl-1"
    });
    mockResolveListingContext.mockReturnValue({
      userId: "user-1",
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "image",
      cacheKey: "cache-key-1"
    });
    mockBuildUpstreamRequestBody.mockReturnValue({ category: "listing" });
    mockEncodeSseEvent.mockImplementation((payload: unknown) =>
      new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
    );
  });

  it("returns cached stream and skips generation when cache exists", async () => {
    mockGetCachedListingContent.mockResolvedValue([
      {
        hook: "Hook",
        broll_query: "b",
        body: null,
        cta: null,
        caption: "Caption"
      }
    ]);

    const result = await generateListingContentForCurrentUser("listing-1", {
      subcategory: "new_listing"
    });

    expect(result.status).toBe(200);
    expect(mockRunContentGeneration).not.toHaveBeenCalled();
    expect(mockSetCachedListingContent).not.toHaveBeenCalled();
    expect(mockEncodeSseEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "done",
        meta: expect.objectContaining({ model: "cache" })
      })
    );
  });

  it("runs generation and writes batch cache on done", async () => {
    const upstreamStream = new ReadableStream({
      start(controller) {
        controller.close();
      }
    });
    mockGetCachedListingContent.mockResolvedValue(null);
    mockRunContentGeneration.mockResolvedValue({
      stream: upstreamStream,
      status: 200
    });
    mockConsumeSseStream.mockImplementation(
      async (
        _stream: ReadableStream,
        onEvent: (event: {
          type: "done";
          items: Array<{
            hook: string;
            broll_query: string;
            body: null;
            cta: null;
            caption: string;
          }>;
          meta: { model: string; batch_size: number };
        }) => Promise<void>
      ) => {
        await onEvent({
          type: "done",
          items: [
            {
              hook: "Hook",
              broll_query: "broll",
              body: null,
              cta: null,
              caption: "Caption"
            }
          ],
          meta: { model: "test", batch_size: 1 }
        });
      }
    );

    const result = await generateListingContentForCurrentUser("listing-1", {
      subcategory: "new_listing"
    });

    expect(result.status).toBe(200);
    expect(mockRunContentGeneration).toHaveBeenCalledWith("user-1", {
      category: "listing"
    });
    expect(mockSetCachedListingContent).toHaveBeenCalledWith(
      "cache-key-1",
      expect.arrayContaining([expect.objectContaining({ hook: "Hook" })])
    );
    expect(mockEncodeSseEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "done",
        meta: expect.objectContaining({ model: "generated" })
      })
    );
  });
});
