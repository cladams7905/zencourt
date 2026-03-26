/** @jest-environment node */

const mockRequireAuthenticatedUser = jest.fn();
const mockGetUserListingSummariesPage = jest.fn();
const mockRequireListingAccess = jest.fn();
const mockGetListingVideoStatus = jest.fn();
const mockGetListingImages = jest.fn();
const mockMapListingImageToDisplayItem = jest.fn((item) => item);
const mockGetAllCachedListingContentForCreate = jest.fn();
const mockGetContentByListingId = jest.fn();
const mockGetUserMedia = jest.fn();
const mockGetCurrentVideoClipVersionsByListingId = jest.fn();
const mockGetCurrentVideoClipsWithCurrentVersionsByListingId = jest.fn();
const mockGetSuccessfulVideoClipVersionsByClipIds = jest.fn();
const mockCreateVideoClip = jest.fn();
const mockCreateVideoClipVersion = jest.fn();
const mockGetVideoClipById = jest.fn();
const mockGetVideoClipVersionBySourceVideoGenJobId = jest.fn();
const mockUpdateVideoClip = jest.fn();
const mockGetVideoGenJobById = jest.fn();
const mockGetVideoGenBatchById = jest.fn();
const mockUpdateVideoGenBatch = jest.fn();
const mockUpdateVideoGenJob = jest.fn();
const mockUpdateVideoClipVersion = jest.fn();

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings", () => ({
  getUserListingSummariesPage: (...args: unknown[]) =>
    (mockGetUserListingSummariesPage as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listings/access", () => ({
  requireListingAccess: (...args: unknown[]) =>
    (mockRequireListingAccess as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/videoGeneration", () => ({
  getListingVideoStatus: (...args: unknown[]) =>
    (mockGetListingVideoStatus as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/listingImages", () => ({
  getListingImages: (...args: unknown[]) =>
    (mockGetListingImages as (...a: unknown[]) => unknown)(...args),
  mapListingImageToDisplayItem: (...args: unknown[]) =>
    (mockMapListingImageToDisplayItem as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/infra/cache/listingContent/cache", () => ({
  getCachedListingContentForCreateFilter: (...args: unknown[]) =>
    (mockGetAllCachedListingContentForCreate as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/content", () => ({
  getContentByListingId: (...args: unknown[]) =>
    (mockGetContentByListingId as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/userMedia/queries", () => ({
  getUserMedia: (...args: unknown[]) =>
    (mockGetUserMedia as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/models/videoGen", () => ({
  getCurrentVideoClipVersionsByListingId: (...args: unknown[]) =>
    (mockGetCurrentVideoClipVersionsByListingId as (...a: unknown[]) => unknown)(
      ...args
    ),
  getCurrentVideoClipsWithCurrentVersionsByListingId: (...args: unknown[]) =>
    (mockGetCurrentVideoClipsWithCurrentVersionsByListingId as (
      ...a: unknown[]
    ) => unknown)(...args),
  getSuccessfulVideoClipVersionsByClipIds: (...args: unknown[]) =>
    (mockGetSuccessfulVideoClipVersionsByClipIds as (...a: unknown[]) => unknown)(
      ...args
    ),
  createVideoClip: (...args: unknown[]) =>
    (mockCreateVideoClip as (...a: unknown[]) => unknown)(...args),
  createVideoClipVersion: (...args: unknown[]) =>
    (mockCreateVideoClipVersion as (...a: unknown[]) => unknown)(...args),
  getVideoClipById: (...args: unknown[]) =>
    (mockGetVideoClipById as (...a: unknown[]) => unknown)(...args),
  getVideoClipVersionBySourceVideoGenJobId: (...args: unknown[]) =>
    (mockGetVideoClipVersionBySourceVideoGenJobId as (
      ...a: unknown[]
    ) => unknown)(...args),
  getVideoGenJobById: (...args: unknown[]) =>
    (mockGetVideoGenJobById as (...a: unknown[]) => unknown)(...args),
  getVideoGenBatchById: (...args: unknown[]) =>
    (mockGetVideoGenBatchById as (...a: unknown[]) => unknown)(...args),
  updateVideoClip: (...args: unknown[]) =>
    (mockUpdateVideoClip as (...a: unknown[]) => unknown)(...args),
  updateVideoGenBatch: (...args: unknown[]) =>
    (mockUpdateVideoGenBatch as (...a: unknown[]) => unknown)(...args),
  updateVideoGenJob: (...args: unknown[]) =>
    (mockUpdateVideoGenJob as (...a: unknown[]) => unknown)(...args),
  updateVideoClipVersion: (...args: unknown[]) =>
    (mockUpdateVideoClipVersion as (...a: unknown[]) => unknown)(...args)
}));

import {
  getCurrentUserListingSummariesPage,
  getListingCreateViewDataForCurrentUser,
  getListingClipVersionItemsForCurrentUser
} from "@web/src/server/actions/listings/queries";

describe("listings queries", () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
    mockGetCurrentVideoClipVersionsByListingId.mockResolvedValue([]);
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId.mockResolvedValue([]);
    mockGetSuccessfulVideoClipVersionsByClipIds.mockResolvedValue(new Map());
    mockGetContentByListingId.mockResolvedValue([]);
    mockGetUserMedia.mockResolvedValue([]);
    mockCreateVideoClip.mockResolvedValue(undefined);
    mockCreateVideoClipVersion.mockResolvedValue(undefined);
    mockGetVideoClipById.mockResolvedValue(null);
    mockGetVideoClipVersionBySourceVideoGenJobId.mockResolvedValue(null);
    mockUpdateVideoClip.mockResolvedValue(undefined);
    mockGetVideoGenJobById.mockResolvedValue(null);
    mockGetVideoGenBatchById.mockResolvedValue(null);
    mockUpdateVideoGenBatch.mockResolvedValue(undefined);
    mockUpdateVideoGenJob.mockResolvedValue(undefined);
    mockUpdateVideoClipVersion.mockResolvedValue(undefined);
  });

  it("delegates to getUserListingSummariesPage with current user id", async () => {
    mockGetUserListingSummariesPage.mockResolvedValueOnce({
      rows: [{ id: "listing-1" }],
      total: 1
    });

    const result = await getCurrentUserListingSummariesPage({
      limit: 20,
      offset: 40
    });

    expect(mockGetUserListingSummariesPage).toHaveBeenCalledWith("user-1", {
      limit: 20,
      offset: 40
    });
    expect(result).toEqual({
      rows: [{ id: "listing-1" }],
      total: 1
    });
  });

  it("loads create-view data through action layer for current user", async () => {
    mockGetListingVideoStatus.mockResolvedValueOnce({
      jobs: [
        {
          jobId: "job-1",
          status: "completed",
          videoUrl: "https://v",
          thumbnailUrl: "https://t",
          roomName: "Kitchen",
          clipIndex: 0,
          sortOrder: 1,
          prompt: "Forward pan through the Kitchen.",
          imageUrls: ["https://signed/kitchen.jpg"]
        }
      ]
    });
    mockGetCurrentVideoClipVersionsByListingId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "clip-version-1",
          videoClipId: "listing-1:kitchen:0",
          versionNumber: 1
        }
      ]);
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId
      .mockResolvedValueOnce([
        {
          clip: {
            id: "listing-1:kitchen:0",
            listingId: "listing-1",
            roomId: null,
            roomName: "Kitchen",
            category: "kitchen",
            clipIndex: 0,
            sortOrder: 1,
            currentVideoClipVersionId: "clip-version-1"
          },
          clipVersion: {
            id: "clip-version-1",
            videoClipId: "listing-1:kitchen:0",
            thumbnailUrl: "https://t",
            videoUrl: "https://v",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            aiDirections: "",
            versionNumber: 1,
            status: "completed",
            durationSeconds: 4,
            orientation: "vertical",
            generationModel: "veo3.1_fast"
          }
        }
      ]);
    mockGetVideoClipById
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "listing-1:kitchen:0",
        listingId: "listing-1",
        roomId: null,
        roomName: "Kitchen",
        category: "kitchen",
        clipIndex: 0,
        sortOrder: 1,
        currentVideoClipVersionId: "clip-version-1"
      });
    mockGetSuccessfulVideoClipVersionsByClipIds.mockResolvedValueOnce(
      new Map([
        [
          "listing-1:kitchen:0",
          [
            {
              id: "clip-version-1",
              videoClipId: "listing-1:kitchen:0",
              thumbnailUrl: "https://t",
              videoUrl: "https://v",
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              aiDirections: "",
              versionNumber: 1,
              status: "completed",
              durationSeconds: 4,
              orientation: "vertical",
              generationModel: "veo3.1_fast"
            }
          ]
        ]
      ])
    );
    mockGetListingImages.mockResolvedValueOnce([{ id: "img-1" }]);
    mockGetAllCachedListingContentForCreate.mockResolvedValueOnce([
      { id: "cached-1" }
    ]);
    mockGetContentByListingId.mockResolvedValueOnce([]);
    mockGetUserMedia.mockResolvedValueOnce([]);
    mockMapListingImageToDisplayItem.mockReturnValueOnce({ id: "img-1-mapped" });

    const result = await getListingCreateViewDataForCurrentUser("listing-1");

    expect(mockRequireListingAccess).toHaveBeenCalledWith("listing-1", "user-1");
    expect(mockGetListingVideoStatus).toHaveBeenCalledWith("listing-1");
    expect(mockCreateVideoClip).toHaveBeenCalledTimes(1);
    expect(mockCreateVideoClipVersion).toHaveBeenCalledTimes(1);
    expect(mockGetVideoClipById).toHaveBeenCalledWith("listing-1:kitchen:0");
    expect(mockUpdateVideoClip).toHaveBeenCalledWith("listing-1:kitchen:0", {
      currentVideoClipVersionId: expect.any(String)
    });
    expect(mockCreateVideoClipVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Forward pan through the Kitchen.",
        imageUrls: ["https://signed/kitchen.jpg"]
      })
    );
    expect(mockGetListingImages).toHaveBeenCalledWith("user-1", "listing-1");
    expect(mockGetAllCachedListingContentForCreate).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "video"
    });
    expect(result).toEqual({
      videoItems: [
        expect.objectContaining({
          id: "listing-1:kitchen:0",
          clipVersionId: "clip-version-1",
          videoUrl: "https://v",
          thumbnail: "https://t",
          roomName: "Kitchen"
        })
      ],
      clipVersionItems: [
        expect.objectContaining({
          clipId: "listing-1:kitchen:0",
          roomName: "Kitchen"
        })
      ],
      listingPostItems: [
        expect.objectContaining({
          id: "cached-1",
          contentSource: "cached_create"
        })
      ],
      listingImages: [{ id: "img-1-mapped" }]
    });
  });

  it("limits create-view post items to the first eight items for the active filter", async () => {
    mockGetListingVideoStatus.mockResolvedValueOnce({ jobs: [] });
    mockRequireListingAccess.mockResolvedValueOnce({ id: "listing-1" });
    mockGetListingImages.mockResolvedValueOnce([]);
    mockGetUserMedia.mockResolvedValueOnce([]);
    mockGetAllCachedListingContentForCreate.mockResolvedValueOnce(
      Array.from({ length: 10 }, (_, index) => ({
        id: `cached-${index + 1}`,
        hook: `Cached ${index + 1}`,
        listingSubcategory: "new_listing",
        mediaType: "video"
      }))
    );

    const result = await getListingCreateViewDataForCurrentUser("listing-1");

    expect(result.listingPostItems).toHaveLength(8);
    expect(result.listingPostItems.map((item) => item.id)).toEqual([
      "cached-1",
      "cached-2",
      "cached-3",
      "cached-4",
      "cached-5",
      "cached-6",
      "cached-7",
      "cached-8"
    ]);
  });

  it("returns persisted saved reels alongside cached reels and user media videos", async () => {
    mockGetListingVideoStatus.mockResolvedValueOnce({ jobs: [] });
    mockGetCurrentVideoClipVersionsByListingId.mockResolvedValueOnce([
      {
        id: "clip-version-1",
        videoClipId: "listing-1:kitchen:0",
        versionNumber: 1
      }
    ]);
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId
      .mockResolvedValueOnce([
        {
          clip: {
            id: "listing-1:kitchen:0",
            listingId: "listing-1",
            roomId: null,
            roomName: "Kitchen",
            category: "kitchen",
            clipIndex: 0,
            sortOrder: 1,
            currentVideoClipVersionId: "clip-version-1"
          },
          clipVersion: {
            id: "clip-version-1",
            videoClipId: "listing-1:kitchen:0",
            thumbnailUrl: "https://thumb/clip.jpg",
            videoUrl: "https://video/clip.mp4",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
            durationSeconds: 4,
            orientation: "vertical",
            generationModel: "veo3.1_fast",
            status: "completed"
          }
        }
      ]);
    mockGetVideoClipById.mockResolvedValue({
      id: "listing-1:kitchen:0",
      listingId: "listing-1",
      roomId: null,
      roomName: "Kitchen",
      category: "kitchen",
      clipIndex: 0,
      sortOrder: 1,
      currentVideoClipVersionId: "clip-version-1"
    });
    mockGetSuccessfulVideoClipVersionsByClipIds.mockResolvedValueOnce(
      new Map([
        [
          "listing-1:kitchen:0",
          [
            {
              id: "clip-version-1",
              videoClipId: "listing-1:kitchen:0",
              thumbnailUrl: "https://thumb/clip.jpg",
              videoUrl: "https://video/clip.mp4",
              createdAt: new Date("2026-01-01T00:00:00.000Z"),
              durationSeconds: 4,
              orientation: "vertical",
              generationModel: "veo3.1_fast",
              status: "completed"
            }
          ]
        ]
      ])
    );
    mockGetListingImages.mockResolvedValueOnce([]);
    mockGetAllCachedListingContentForCreate.mockResolvedValueOnce([
      {
        id: "cached-keep",
        hook: "Unsaved reel",
        caption: "Keep cache",
        listingSubcategory: "new_listing",
        mediaType: "video",
        cacheKeyTimestamp: 456,
        cacheKeyId: 7
      },
      {
        id: "cached-duplicate",
        hook: "Duplicate cache reel",
        caption: "Should be suppressed",
        listingSubcategory: "new_listing",
        mediaType: "video",
        cacheKeyTimestamp: 123,
        cacheKeyId: 4
      }
    ]);
    mockGetContentByListingId.mockResolvedValueOnce([
      {
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
          hook: "Saved reel",
          caption: "Saved caption",
          body: [{ header: "Saved slide", content: "Saved body" }],
          sequence: [
            {
              sourceType: "listing_clip",
              sourceId: "listing-1:kitchen:0",
              durationSeconds: 2.5
            }
          ],
          originCacheKeyTimestamp: 123,
          originCacheKeyId: 4
        },
        isFavorite: false,
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z")
      },
      {
        id: "ignored-video-content",
        listingId: "listing-1",
        userId: "user-1",
        contentType: "video",
        status: "draft",
        contentUrl: null,
        thumbnailUrl: null,
        metadata: { source: "other_video" },
        isFavorite: false,
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
        updatedAt: new Date("2026-01-03T00:00:00.000Z")
      }
    ]);
    mockGetUserMedia.mockResolvedValueOnce([
      {
        id: "media-1",
        userId: "user-1",
        type: "video",
        url: "https://user-media/video.mp4",
        thumbnailUrl: "https://user-media/thumb.jpg",
        usageCount: 0,
        uploadedAt: new Date("2026-01-04T00:00:00.000Z")
      },
      {
        id: "media-image",
        userId: "user-1",
        type: "image",
        url: "https://user-media/image.jpg",
        thumbnailUrl: null,
        usageCount: 0,
        uploadedAt: new Date("2026-01-04T00:00:00.000Z")
      }
    ]);

    const result = await getListingCreateViewDataForCurrentUser("listing-1");

    expect(result.listingPostItems.map((item) => item.id)).toEqual([
      "saved-saved-reel-1",
      "cached-keep"
    ]);
    expect(result.listingPostItems[0]).toEqual(
      expect.objectContaining({
        contentSource: "saved_content",
        savedContentId: "saved-reel-1",
        hook: "Saved reel"
      })
    );
    expect(result.videoItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "listing-1:kitchen:0",
          reelClipSource: "listing_clip"
        }),
        expect.objectContaining({
          id: "user-media:media-1",
          reelClipSource: "user_media",
          videoUrl: "https://user-media/video.mp4"
        })
      ])
    );
  });

  it("seeds completed regeneration jobs as the next version for an existing clip", async () => {
    mockGetListingVideoStatus.mockResolvedValueOnce({
      jobs: [
        {
          jobId: "job-2",
          status: "completed",
          videoUrl: "https://v2",
          thumbnailUrl: "https://t2",
          roomName: "Exterior Front",
          category: "exterior-front",
          clipIndex: 0,
          sortOrder: 0,
          prompt: "Aerial flyover of the front of the house.",
          imageUrls: ["https://signed/front.jpg"]
        }
      ]
    });
    mockGetCurrentVideoClipVersionsByListingId
      .mockResolvedValueOnce([
        {
          id: "clip-version-2",
          videoClipId: "listing-1:exterior-front:0",
          sourceVideoGenJobId: "job-1",
          versionNumber: 2
        }
      ])
      .mockResolvedValueOnce([
        {
          id: "clip-version-3",
          videoClipId: "listing-1:exterior-front:0",
          versionNumber: 3
        }
      ]);
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId
      .mockResolvedValueOnce([
        {
          clip: {
            id: "listing-1:exterior-front:0",
            listingId: "listing-1",
            roomId: null,
            roomName: "Exterior Front",
            category: "exterior-front",
            clipIndex: 0,
            sortOrder: 0,
            currentVideoClipVersionId: "clip-version-2"
          },
          clipVersion: {
            id: "clip-version-2",
            videoClipId: "listing-1:exterior-front:0",
            sourceVideoGenJobId: "job-1",
            versionNumber: 2
          }
        }
      ])
      .mockResolvedValueOnce([
        {
          clip: {
            id: "listing-1:exterior-front:0",
            listingId: "listing-1",
            roomId: null,
            roomName: "Exterior Front",
            category: "exterior-front",
            clipIndex: 0,
            sortOrder: 0,
            currentVideoClipVersionId: "clip-version-3"
          },
          clipVersion: {
            id: "clip-version-3",
            videoClipId: "listing-1:exterior-front:0",
            thumbnailUrl: "https://t2",
            videoUrl: "https://v2",
            createdAt: new Date("2026-01-02T00:00:00.000Z"),
            aiDirections: "",
            versionNumber: 3,
            status: "completed",
            durationSeconds: 4,
            orientation: "vertical",
            generationModel: "veo3.1_fast"
          }
        }
      ]);
    mockGetVideoClipById
      .mockResolvedValueOnce({
        id: "listing-1:exterior-front:0",
        listingId: "listing-1",
        roomId: null,
        roomName: "Exterior Front",
        category: "exterior-front",
        clipIndex: 0,
        sortOrder: 0,
        currentVideoClipVersionId: "clip-version-2"
      })
      .mockResolvedValueOnce({
        id: "listing-1:exterior-front:0",
        listingId: "listing-1",
        roomId: null,
        roomName: "Exterior Front",
        category: "exterior-front",
        clipIndex: 0,
        sortOrder: 0,
        currentVideoClipVersionId: "clip-version-3"
      });
    mockGetSuccessfulVideoClipVersionsByClipIds.mockResolvedValueOnce(
      new Map([
        [
          "listing-1:exterior-front:0",
          [
            {
              id: "clip-version-3",
              videoClipId: "listing-1:exterior-front:0",
              thumbnailUrl: "https://t2",
              videoUrl: "https://v2",
              createdAt: new Date("2026-01-02T00:00:00.000Z"),
              aiDirections: "",
              versionNumber: 3,
              status: "completed",
              durationSeconds: 4,
              orientation: "vertical",
              generationModel: "veo3.1_fast"
            }
          ]
        ]
      ])
    );
    mockGetListingImages.mockResolvedValueOnce([]);
    mockGetAllCachedListingContentForCreate.mockResolvedValueOnce([]);

    await getListingCreateViewDataForCurrentUser("listing-1");

    expect(mockCreateVideoClip).not.toHaveBeenCalled();
    expect(mockCreateVideoClipVersion).toHaveBeenCalledWith(
      expect.objectContaining({
        videoClipId: "listing-1:exterior-front:0",
        sourceVideoGenJobId: "job-2"
      })
    );
  });

  it("does not seed failed jobs as clip versions even when they have partial media fields", async () => {
    mockGetListingVideoStatus.mockResolvedValueOnce({
      jobs: [
        {
          jobId: "job-failed",
          status: "failed",
          videoUrl: null,
          thumbnailUrl: "https://partial-thumb",
          roomName: "Kitchen",
          category: "kitchen",
          clipIndex: 0,
          sortOrder: 1,
          prompt: "Forward pan through the Kitchen.",
          imageUrls: ["https://signed/kitchen.jpg"],
          errorMessage: "provider failed"
        }
      ]
    });
    mockGetCurrentVideoClipVersionsByListingId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    mockGetListingImages.mockResolvedValueOnce([]);
    mockGetAllCachedListingContentForCreate.mockResolvedValueOnce([]);

    const result = await getListingCreateViewDataForCurrentUser("listing-1");

    expect(mockCreateVideoClip).not.toHaveBeenCalled();
    expect(mockCreateVideoClipVersion).not.toHaveBeenCalled();
    expect(mockUpdateVideoClip).not.toHaveBeenCalled();
    expect(result.videoItems).toEqual([]);
    expect(result.clipVersionItems).toEqual([]);
  });

  it("does not fail a stale regenerating clip version based on age alone", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-20T10:05:00.000Z"));

    mockGetListingVideoStatus.mockResolvedValueOnce({ jobs: [] });
    mockGetCurrentVideoClipVersionsByListingId.mockResolvedValueOnce([
      {
        id: "clip-version-2",
        videoClipId: "clip-1",
        sourceVideoGenJobId: "job-2",
        status: "processing",
        createdAt: new Date("2026-03-20T10:00:00.000Z")
      }
    ]);
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId
      .mockResolvedValueOnce([
        {
          clip: {
            id: "clip-1",
            listingId: "listing-1",
            roomId: "room-1",
            roomName: "Kitchen",
            category: "kitchen",
            clipIndex: 0,
            sortOrder: 0,
            currentVideoClipVersionId: "clip-version-2"
          },
          clipVersion: {
            id: "clip-version-2",
            videoClipId: "clip-1",
            sourceVideoGenJobId: "job-2",
            status: "processing",
            createdAt: new Date("2026-03-20T10:00:00.000Z"),
            thumbnailUrl: null,
            videoUrl: null,
            aiDirections: "",
            versionNumber: 2
          }
        }
      ]);
    mockGetSuccessfulVideoClipVersionsByClipIds.mockResolvedValue(new Map());

    const result = await getListingClipVersionItemsForCurrentUser("listing-1");

    expect(mockUpdateVideoClipVersion).not.toHaveBeenCalled();
    expect(mockUpdateVideoGenJob).not.toHaveBeenCalled();
    expect(mockUpdateVideoGenBatch).not.toHaveBeenCalled();
    expect(result).toEqual(expect.any(Array));

    jest.useRealTimers();
  });

  it("falls back to the last successful version after a regeneration fails", async () => {
    mockGetListingVideoStatus.mockResolvedValueOnce({ jobs: [] });
    mockGetCurrentVideoClipVersionsByListingId.mockResolvedValueOnce([
      {
        id: "clip-version-2",
        videoClipId: "clip-1",
        sourceVideoGenJobId: "job-2",
        status: "failed",
        createdAt: new Date("2026-03-20T10:05:00.000Z"),
        versionNumber: 2
      }
    ]);
    mockGetCurrentVideoClipsWithCurrentVersionsByListingId
      .mockResolvedValueOnce([
        {
          clip: {
            id: "clip-1",
            listingId: "listing-1",
            roomId: "room-1",
            roomName: "Kitchen",
            category: "kitchen",
            clipIndex: 0,
            sortOrder: 0,
            currentVideoClipVersionId: "clip-version-2"
          },
          clipVersion: {
            id: "clip-version-2",
            videoClipId: "clip-1",
            sourceVideoGenJobId: "job-2",
            status: "failed",
            createdAt: new Date("2026-03-20T10:05:00.000Z"),
            thumbnailUrl: null,
            videoUrl: null,
            aiDirections: "new directions",
            versionNumber: 2,
            durationSeconds: null,
            orientation: "vertical",
            generationModel: "veo3.1_fast"
          }
        }
      ]);
    mockGetSuccessfulVideoClipVersionsByClipIds.mockResolvedValue(
      new Map([
        [
          "clip-1",
          [
            {
              id: "clip-version-1",
              videoClipId: "clip-1",
              thumbnailUrl: "https://thumb-success",
              videoUrl: "https://video-success",
              createdAt: new Date("2026-03-20T10:00:00.000Z"),
              aiDirections: "old directions",
              versionNumber: 1,
              status: "completed",
              durationSeconds: 4,
              orientation: "vertical",
              generationModel: "veo3.1_fast"
            }
          ]
        ]
      ])
    );

    const result = await getListingClipVersionItemsForCurrentUser("listing-1");

    expect(result).toEqual([
      expect.objectContaining({
        clipId: "clip-1",
        currentVersion: expect.objectContaining({
          clipVersionId: "clip-version-1",
          versionStatus: "completed",
          thumbnail: "https://thumb-success",
          durationSeconds: 4
        }),
        inFlightVersion: expect.objectContaining({
          clipVersionId: "clip-version-2",
          versionStatus: "failed",
          aiDirections: "new directions"
        })
      })
    ]);
  });

  it("requests only the active create filter from the cache layer", async () => {
    mockGetListingVideoStatus.mockResolvedValueOnce({ jobs: [] });
    mockGetListingImages.mockResolvedValueOnce([]);
    mockGetAllCachedListingContentForCreate.mockResolvedValueOnce([]);

    await getListingCreateViewDataForCurrentUser("listing-1");

    expect(mockGetAllCachedListingContentForCreate).toHaveBeenCalledWith({
      userId: "user-1",
      listingId: "listing-1",
      subcategory: "new_listing",
      mediaType: "video"
    });
  });
});
