const mockGetSignedUploadUrl = jest.fn();
const mockBuildPublicUrlForKey = jest.fn((key: string) => `https://public/${key}`);

jest.mock("../service", () => ({
  __esModule: true,
  default: {
    getSignedUploadUrl: (...args: unknown[]) => mockGetSignedUploadUrl(...args),
    buildPublicUrlForKey: (key: string) => mockBuildPublicUrlForKey(key)
  }
}));

import {
  prepareListingImageUploadUrls,
  prepareUserMediaUploadUrls,
  mapUserMediaRecordInputs
} from "../uploadPreparation";
import { getUserMediaPath, getUserMediaThumbnailPath } from "@shared/utils/storagePaths";

describe("storage uploadPreparation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws when no listing files are provided", async () => {
    await expect(
      prepareListingImageUploadUrls("u1", "l1", [], 0)
    ).rejects.toThrow("No files provided for upload");
  });

  it("prepares listing image upload and rejects invalid mime", async () => {
    mockGetSignedUploadUrl.mockResolvedValueOnce({ success: true, url: "https://signed" });

    const result = await prepareListingImageUploadUrls(
      "u1",
      "l1",
      [
        { id: "1", fileName: "a.jpg", fileType: "image/jpeg", fileSize: 1024 },
        { id: "2", fileName: "b.txt", fileType: "text/plain", fileSize: 100 }
      ] as never,
      0
    );

    expect(result.uploads).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
  });

  it("prepares video upload including thumbnail urls", async () => {
    mockGetSignedUploadUrl
      .mockResolvedValueOnce({ success: true, url: "https://signed-video" })
      .mockResolvedValueOnce({ success: true, url: "https://signed-thumb" });

    const result = await prepareUserMediaUploadUrls("u1", [
      { id: "1", fileName: "clip.mp4", fileType: "video/mp4", fileSize: 1024 }
    ] as never);

    expect(result.uploads).toHaveLength(1);
    expect(result.uploads[0]).toEqual(
      expect.objectContaining({
        type: "video",
        thumbnailUploadUrl: "https://signed-thumb"
      })
    );
  });

  it("maps user media record inputs and validates key prefixes", () => {
    const key = getUserMediaPath("u1", "image", "img.jpg");
    const thumb = getUserMediaThumbnailPath("u1", "img.jpg");

    const mapped = mapUserMediaRecordInputs("u1", [
      { type: "image", key },
      { type: "video", key: getUserMediaPath("u1", "video", "v.mp4"), thumbnailKey: thumb }
    ] as never);

    expect(mapped).toEqual([
      {
        type: "image",
        url: `https://public/${key}`,
        thumbnailUrl: null
      },
      {
        type: "video",
        url: `https://public/${getUserMediaPath("u1", "video", "v.mp4")}`,
        thumbnailUrl: `https://public/${thumb}`
      }
    ]);

    expect(() =>
      mapUserMediaRecordInputs("u1", [{ type: "image", key: "bad/key" }] as never)
    ).toThrow("Invalid media upload key");
  });
});
