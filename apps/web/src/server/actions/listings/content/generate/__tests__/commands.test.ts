/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockSetCachedListingContentItem = jest.fn();
const mockRunContentGeneration = jest.fn();
const mockParseAndValidateParams = jest.fn();
const mockResolveListingContext = jest.fn();
const mockBuildUpstreamRequestBody = jest.fn();
const mockBuildListingCreatePreviewPlans = jest.fn();
const mockEncodeSseEvent = jest.fn();
const mockConsumeSseStream = jest.fn();
const mockGetCurrentVideoClipsWithCurrentVersionsByListingId = jest.fn();

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

jest.mock("@web/src/lib/domain/listings/createPreviewPlans", () => ({
  buildListingCreatePreviewPlans: (...args: unknown[]) =>
    (mockBuildListingCreatePreviewPlans as (...a: unknown[]) => unknown)(
      ...args
    )
}));

jest.mock("@web/src/lib/sse/sseEncoder", () => ({
  encodeSseEvent: (...args: unknown[]) =>
    (mockEncodeSseEvent as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/lib/sse/sseEventStream", () => ({
  consumeSseStream: (...args: unknown[]) =>
    (mockConsumeSseStream as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/video", () => ({
  getCurrentVideoClipsWithCurrentVersionsByListingId: (...args: unknown[]) =>
    (
      mockGetCurrentVideoClipsWithCurrentVersionsByListingId as (
        ...a: unknown[]
      ) => unknown
    )(...args)
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
    mockBuildListingCreatePreviewPlans.mockReturnValue([]);
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId.mockResolvedValue(
      []
    );
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

  it("emits cache metadata before video delta events so streamed reels can use stable cache identity", async () => {
    const upstreamStream = new ReadableStream({
      start(controller) {
        controller.close();
      }
    });
    mockRunContentGeneration.mockResolvedValue({
      stream: upstreamStream,
      status: 200
    });
    mockParseAndValidateParams.mockReturnValue({
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "video",
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
      mediaType: "video"
    });
    mockConsumeSseStream.mockImplementation(
      async (
        _stream: ReadableStream,
        onEvent: (event: { type: "delta"; text: string }) => Promise<void>
      ) => {
        await onEvent({
          type: "delta",
          text: '[{"hook":"Hook"}'
        });
      }
    );

    const result = await generateListingContentForCurrentUser("listing-1", {
      subcategory: "new_listing"
    });
    const reader = result.stream.getReader();
    await reader.read();

    expect(mockEncodeSseEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "meta",
        meta: expect.objectContaining({
          cache_key_timestamp: expect.any(Number)
        })
      })
    );
  });

  it("writes generated video cache items with ordered clip ids and duration overrides", async () => {
    const upstreamStream = new ReadableStream({
      start(controller) {
        controller.close();
      }
    });
    mockRunContentGeneration.mockResolvedValue({
      stream: upstreamStream,
      status: 200
    });
    mockParseAndValidateParams.mockReturnValue({
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "video",
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
      mediaType: "video"
    });
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId.mockResolvedValue([
      {
        clip: {
          id: "clip-1",
          category: "kitchen",
          roomName: "Kitchen"
        },
        clipVersion: {
          videoUrl: "https://example.com/1.mp4",
          thumbnailUrl: "https://example.com/1.jpg",
          durationSeconds: 3
        }
      },
      {
        clip: {
          id: "clip-2",
          category: "exterior",
          roomName: "Exterior"
        },
        clipVersion: {
          videoUrl: "https://example.com/2.mp4",
          thumbnailUrl: "https://example.com/2.jpg",
          durationSeconds: 4
        }
      }
    ]);
    mockBuildListingCreatePreviewPlans.mockReturnValue([
      {
        id: "plan-1",
        totalDurationSeconds: 7,
        segments: [
          { clipId: "clip-2", durationSeconds: 4, maxDurationSeconds: 4 },
          { clipId: "clip-1", durationSeconds: 3, maxDurationSeconds: 3 }
        ]
      }
    ]);
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

    await generateListingContentForCurrentUser("listing-1", {
      subcategory: "new_listing"
    });

    expect(mockSetCachedListingContentItem).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaType: "video",
        item: expect.objectContaining({
          hook: "Hook",
          orderedClipIds: ["clip-2", "clip-1"],
          clipDurationOverrides: {
            "clip-2": 4,
            "clip-1": 3
          }
        })
      })
    );
  });
});
