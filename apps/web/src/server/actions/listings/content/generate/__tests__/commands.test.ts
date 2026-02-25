/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockSetCachedListingContentItem = jest.fn();
const mockRunContentGeneration = jest.fn();
const mockParseAndValidateParams = jest.fn();
const mockResolveListingContext = jest.fn();
const mockBuildUpstreamRequestBody = jest.fn();
const mockEncodeSseEvent = jest.fn();
const mockConsumeSseStream = jest.fn();

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/infra/cache/listingContent/cache", () => ({
  setCachedListingContentItem: (...args: unknown[]) =>
    (mockSetCachedListingContentItem as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/content/generate/helpers", () => ({
  runContentGenerationForUser: (...args: unknown[]) =>
    (mockRunContentGeneration as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/actions/listings/content/generate/helpers", () => ({
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

import { generateListingContentForCurrentUser } from "@web/src/server/actions/listings/content/generate/commands";

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
      mediaType: "image"
    });
    mockBuildUpstreamRequestBody.mockReturnValue({ category: "listing" });
    mockEncodeSseEvent.mockImplementation((payload: unknown) =>
      new TextEncoder().encode(`data: ${JSON.stringify(payload)}\n\n`)
    );
  });

  it("runs generation and returns stream", async () => {
    const upstreamStream = new ReadableStream({
      start(controller) {
        controller.close();
      }
    });
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
    expect(mockEncodeSseEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "done",
        meta: expect.objectContaining({ model: "generated" })
      })
    );
  });
});
