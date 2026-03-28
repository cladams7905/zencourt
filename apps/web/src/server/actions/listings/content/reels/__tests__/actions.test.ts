/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetCachedListingContentItem = jest.fn();
const mockDeleteCachedListingContentItem = jest.fn();
const mockGetAllCachedListingContentForCreate = jest.fn();
const mockCreateContent = jest.fn();
const mockGetContentById = jest.fn();
const mockGetContentByListingId = jest.fn();
const mockUpdateContent = jest.fn();

jest.mock("@web/src/server/actions/shared/auth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args),
  withCurrentUserListingAccess: async (
    listingIdOrResolver:
      | string
      | ((context: { user: { id: string } }) => string | Promise<string>),
    run: (context: { user: { id: string }; listing: unknown }) => unknown
  ) => {
    const user = await mockRequireAuthenticatedUser();
    const listingId =
      typeof listingIdOrResolver === "function"
        ? await listingIdOrResolver({ user })
        : listingIdOrResolver;
    const listing = await mockRequireListingAccess(listingId, user.id);
    return run({ user, listing });
  }
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/infra/cache/listingContent/cache", () => ({
  getCachedListingContentItem: (...args: unknown[]) =>
    (mockGetCachedListingContentItem as (...a: unknown[]) => unknown)(...args),
  deleteCachedListingContentItem: (...args: unknown[]) =>
    (mockDeleteCachedListingContentItem as (...a: unknown[]) => unknown)(
      ...args
    ),
  getAllCachedListingContentForCreate: (...args: unknown[]) =>
    (mockGetAllCachedListingContentForCreate as (...a: unknown[]) => unknown)(
      ...args
    )
}));

jest.mock("@web/src/server/models/content", () => ({
  createContent: (...args: unknown[]) =>
    (mockCreateContent as (...a: unknown[]) => unknown)(...args),
  getContentById: (...args: unknown[]) =>
    (mockGetContentById as (...a: unknown[]) => unknown)(...args),
  getContentByListingId: (...args: unknown[]) =>
    (mockGetContentByListingId as (...a: unknown[]) => unknown)(...args),
  updateContent: (...args: unknown[]) =>
    (mockUpdateContent as (...a: unknown[]) => unknown)(...args)
}));

import { saveListingVideoReel } from "@web/src/server/actions/listings/content/reels";
import {
  collectReelReferencedUserMediaIds,
  collectReelReferencedUserMediaIdsFromSnapshot
} from "@web/src/server/actions/listings/content/reels/userMedia";

describe("saveListingVideoReel", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockRequireListingAccess.mockResolvedValue({ id: "listing-1" });
  });

  it("promotes a cached reel into content and deletes the source cache row", async () => {
    mockGetCachedListingContentItem.mockResolvedValue({
      hook: "Cached hook",
      caption: "Cached caption",
      broll_query: "kitchen",
      body: null,
      cta: null
    });
    mockCreateContent.mockResolvedValue({
      id: "saved-reel-1",
      listingId: "listing-1",
      userId: "user-1",
      contentType: "video",
      status: "draft",
      contentUrl: null,
      thumbnailUrl: null,
      metadata: {
        source: "listing_reel",
        version: 1,
        listingSubcategory: "new_listing",
        hook: "Updated hook",
        caption: "Updated caption",
        brollQuery: "kitchen",
        sequence: [
          {
            sourceType: "listing_clip",
            sourceId: "clip-1",
            durationSeconds: 2.5
          }
        ],
        originCacheKeyTimestamp: 123,
        originCacheKeyId: 4
      }
    });

    const result = await saveListingVideoReel("listing-1", {
      hook: "Updated hook",
      caption: "Updated caption",
      orderedClipIds: ["clip-1"],
      clipDurationOverrides: { "clip-1": 2.5 },
      sequence: [
        {
          sourceType: "listing_clip" as const,
          sourceId: "clip-1",
          durationSeconds: 2.5
        }
      ],
      saveTarget: {
        contentSource: "cached_create",
        cacheKeyTimestamp: 123,
        cacheKeyId: 4,
        subcategory: "new_listing",
        mediaType: "video"
      }
    });

    expect(mockCreateContent).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        listingId: "listing-1",
        contentType: "video",
        metadata: expect.objectContaining({
          source: "listing_reel",
          originCacheKeyTimestamp: 123,
          originCacheKeyId: 4
        })
      })
    );
    expect(mockDeleteCachedListingContentItem).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "video",
      timestamp: 123,
      id: 4
    });
    expect(result).toEqual(
      expect.objectContaining({
        id: "saved-saved-reel-1",
        contentSource: "saved_content",
        savedContentId: "saved-reel-1"
      })
    );
  });

  it("updates an existing saved reel in content without touching cache", async () => {
    mockGetContentById.mockResolvedValue({
      id: "saved-reel-1",
      listingId: "listing-1",
      userId: "user-1",
      contentType: "video",
      status: "draft",
      contentUrl: null,
      thumbnailUrl: null,
      metadata: {
        source: "listing_reel",
        version: 1,
        listingSubcategory: "new_listing",
        hook: "Original hook",
        caption: "Original caption",
        brollQuery: "kitchen",
        sequence: [
          {
            sourceType: "listing_clip",
            sourceId: "clip-1",
            durationSeconds: 2.5
          }
        ]
      }
    });
    mockUpdateContent.mockResolvedValue({
      id: "saved-reel-1",
      listingId: "listing-1",
      userId: "user-1",
      contentType: "video",
      status: "draft",
      contentUrl: null,
      thumbnailUrl: null,
      metadata: {
        source: "listing_reel",
        version: 1,
        listingSubcategory: "new_listing",
        hook: "Updated hook",
        caption: "Updated caption",
        brollQuery: "kitchen",
        sequence: [
          {
            sourceType: "listing_clip",
            sourceId: "clip-1",
            durationSeconds: 3
          }
        ]
      }
    });

    await saveListingVideoReel("listing-1", {
      hook: "Updated hook",
      caption: "Updated caption",
      orderedClipIds: ["clip-1"],
      clipDurationOverrides: { "clip-1": 3 },
      sequence: [
        {
          sourceType: "listing_clip" as const,
          sourceId: "clip-1",
          durationSeconds: 3
        }
      ],
      saveTarget: {
        contentSource: "saved_content",
        savedContentId: "saved-reel-1"
      }
    });

    expect(mockUpdateContent).toHaveBeenCalledWith(
      "user-1",
      "saved-reel-1",
      expect.objectContaining({
        metadata: expect.objectContaining({
          hook: "Updated hook",
          caption: "Updated caption"
        })
      })
    );
    expect(mockDeleteCachedListingContentItem).not.toHaveBeenCalled();
  });
});

describe("collectReelReferencedUserMediaIdsFromSnapshot", () => {
  it("matches async behavior for saved + cache inputs", () => {
    const saved = [
      {
        metadata: {
          source: "listing_reel" as const,
          version: 1 as const,
          listingSubcategory: "new_listing" as const,
          hook: "h",
          caption: null,
          body: null,
          brollQuery: null,
          sequence: [
            {
              sourceType: "user_media" as const,
              sourceId: "um-1",
              durationSeconds: 1
            }
          ]
        }
      }
    ];
    const cached = [{ orderedClipIds: ["user-media:um-2"] as string[] }];
    const ids = collectReelReferencedUserMediaIdsFromSnapshot(
      saved as never,
      cached as never
    );
    expect(ids.sort()).toEqual(["um-1", "um-2"]);
  });
});

describe("collectReelReferencedUserMediaIds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetContentByListingId.mockResolvedValue([]);
    mockGetAllCachedListingContentForCreate.mockResolvedValue([]);
  });

  it("collects user_media sourceIds from saved reel metadata", async () => {
    mockGetContentByListingId.mockResolvedValue([
      {
        metadata: {
          source: "listing_reel",
          version: 1,
          listingSubcategory: "new_listing",
          hook: "h",
          caption: null,
          body: null,
          brollQuery: null,
          sequence: [
            {
              sourceType: "listing_clip",
              sourceId: "clip-1",
              durationSeconds: 1
            },
            {
              sourceType: "user_media",
              sourceId: "um-1",
              durationSeconds: 2
            }
          ]
        }
      }
    ]);

    const ids = await collectReelReferencedUserMediaIds("user-1", "listing-1");

    expect(ids).toEqual(["um-1"]);
    expect(mockGetContentByListingId).toHaveBeenCalledWith(
      "user-1",
      "listing-1"
    );
    expect(mockGetAllCachedListingContentForCreate).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1"
    });
  });

  it("parses user-media: ids from cached orderedClipIds", async () => {
    mockGetAllCachedListingContentForCreate.mockResolvedValue([
      {
        orderedClipIds: ["clip-a", "user-media:um-x", "user-media:um-y"]
      }
    ]);

    const ids = await collectReelReferencedUserMediaIds("user-1", "listing-1");

    expect(ids.sort()).toEqual(["um-x", "um-y"]);
  });

  it("dedupes ids across DB and cache", async () => {
    mockGetContentByListingId.mockResolvedValue([
      {
        metadata: {
          source: "listing_reel",
          version: 1,
          listingSubcategory: "new_listing",
          hook: "h",
          caption: null,
          body: null,
          brollQuery: null,
          sequence: [
            {
              sourceType: "user_media",
              sourceId: "dup",
              durationSeconds: 1
            }
          ]
        }
      }
    ]);
    mockGetAllCachedListingContentForCreate.mockResolvedValue([
      { orderedClipIds: ["user-media:dup"] }
    ]);

    const ids = await collectReelReferencedUserMediaIds("user-1", "listing-1");

    expect(ids).toEqual(["dup"]);
  });
});
