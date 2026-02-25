const mockNanoid = jest.fn();
const mockBuildRoomsFromImages = jest.fn();
const mockGetCategoryForRoom = jest.fn();
const mockSelectPrimaryImageForRoom = jest.fn();
const mockSelectSecondaryImageForRoom = jest.fn();
const mockBuildPrompt = jest.fn();
const mockGetVideoGenerationConfig = jest.fn();
const mockIsPriorityCategory = jest.fn();

jest.mock("nanoid", () => ({
  nanoid: (...args: unknown[]) => mockNanoid(...args)
}));

jest.mock("@web/src/server/services/videoGeneration/domain/rooms", () => ({
  buildRoomsFromImages: (...args: unknown[]) => mockBuildRoomsFromImages(...args),
  getCategoryForRoom: (...args: unknown[]) => mockGetCategoryForRoom(...args),
  selectPrimaryImageForRoom: (...args: unknown[]) =>
    mockSelectPrimaryImageForRoom(...args),
  selectSecondaryImageForRoom: (...args: unknown[]) =>
    mockSelectSecondaryImageForRoom(...args)
}));

jest.mock("@web/src/server/services/videoGeneration/domain/prompt", () => ({
  buildPrompt: (...args: unknown[]) => mockBuildPrompt(...args)
}));

jest.mock("@web/src/server/services/videoGeneration/config", () => ({
  getVideoGenerationConfig: (...args: unknown[]) =>
    mockGetVideoGenerationConfig(...args)
}));

jest.mock("@shared/utils", () => ({
  isPriorityCategory: (...args: unknown[]) => mockIsPriorityCategory(...args)
}));

import {
  buildJobRecords,
  createParentVideoBatchRecord,
  extractJobIds
} from "../jobs";

describe("video jobs domain", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVideoGenerationConfig.mockReturnValue({
      model: "veo3.1_fast",
      enablePrioritySecondary: true
    });
  });

  it("throws when no rooms are available", async () => {
    mockBuildRoomsFromImages.mockReturnValue([]);

    await expect(
      buildJobRecords({
        parentVideoId: "video-1",
        groupedImages: new Map(),
        listingPrimaryImageUrl: "primary",
        orientation: "vertical",
        resolvePublicDownloadUrls: (urls) => urls
      })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 400,
        body: {
          error: "Invalid request",
          message: "At least one room is required to generate videos"
        }
      })
    );
  });

  it("builds a single primary job when secondary is not eligible", async () => {
    mockNanoid.mockReturnValueOnce("job-1");
    mockBuildRoomsFromImages.mockReturnValue([
      { id: "room-1", name: "Kitchen", roomNumber: 1 }
    ]);
    mockGetCategoryForRoom.mockReturnValue("kitchen");
    mockSelectPrimaryImageForRoom.mockReturnValue("https://img/primary.jpg");
    mockIsPriorityCategory.mockReturnValue(false);
    mockBuildPrompt.mockReturnValue({ prompt: "Primary prompt", templateKey: "t1" });

    const groupedImages = new Map([
      ["kitchen", [{ url: "https://img/primary.jpg", metadata: {} }]]
    ]);

    const records = await buildJobRecords({
      parentVideoId: "video-1",
      groupedImages: groupedImages as never,
      listingPrimaryImageUrl: "https://img/listing.jpg",
      orientation: "vertical",
      resolvePublicDownloadUrls: (urls) => urls.map((u) => `signed:${u}`)
    });

    expect(records).toHaveLength(1);
    expect(records[0]).toEqual(
      expect.objectContaining({
        id: "job-1",
        generationSettings: expect.objectContaining({
          clipIndex: 0,
          sortOrder: 0,
          prompt: "Primary prompt",
          imageUrls: ["signed:https://img/primary.jpg"]
        })
      })
    );
  });

  it("builds secondary jobs and chains template keys", async () => {
    mockNanoid.mockReturnValueOnce("job-1").mockReturnValueOnce("job-2");
    mockBuildRoomsFromImages.mockReturnValue([
      { id: "room-1", name: "Kitchen", roomNumber: 1 }
    ]);
    mockGetCategoryForRoom.mockReturnValue("kitchen");
    mockSelectPrimaryImageForRoom.mockReturnValue("https://img/primary.jpg");
    mockSelectSecondaryImageForRoom.mockReturnValue("https://img/secondary.jpg");
    mockIsPriorityCategory.mockReturnValue(true);
    mockBuildPrompt
      .mockReturnValueOnce({ prompt: "Primary prompt", templateKey: "tpl-a" })
      .mockReturnValueOnce({ prompt: "Secondary prompt", templateKey: "tpl-b" });

    const groupedImages = new Map([
      [
        "kitchen",
        [
          { url: "https://img/primary.jpg", metadata: { perspective: "wide" } },
          { url: "https://img/secondary.jpg", metadata: { perspective: "close" } }
        ]
      ]
    ]);

    const records = await buildJobRecords({
      parentVideoId: "video-1",
      groupedImages: groupedImages as never,
      listingPrimaryImageUrl: "https://img/listing.jpg",
      orientation: "vertical",
      resolvePublicDownloadUrls: (urls) => urls
    });

    expect(records).toHaveLength(2);
    expect(records[0].generationSettings).toEqual(
      expect.objectContaining({ clipIndex: 0, sortOrder: 0, prompt: "Primary prompt" })
    );
    expect(records[1].generationSettings).toEqual(
      expect.objectContaining({ clipIndex: 1, sortOrder: 1, prompt: "Secondary prompt" })
    );
    expect(mockBuildPrompt).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ previousTemplateKey: "tpl-a" })
    );
  });

  it("creates parent batch records and extracts job ids", () => {
    mockNanoid.mockReturnValueOnce("video-abc");
    const batch = createParentVideoBatchRecord("listing-1");

    expect(batch).toEqual({
      id: "video-abc",
      record: {
        id: "video-abc",
        listingId: "listing-1",
        status: "pending",
        errorMessage: null
      }
    });

    expect(extractJobIds([{ id: "j1" }, { id: "j2" }] as never)).toEqual([
      "j1",
      "j2"
    ]);
  });
});
