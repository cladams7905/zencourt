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

  it("rejects listing uploads when they exceed max count or image size", async () => {
    await expect(
      prepareListingImageUploadUrls("u1", "l1", [
        { id: "1", fileName: "a.jpg", fileType: "image/jpeg", fileSize: 1024 }
      ] as never, 40)
    ).rejects.toThrow("Listings can contain up to 40 photos.");

    const result = await prepareListingImageUploadUrls(
      "u1",
      "l1",
      [
        {
          id: "1",
          fileName: "huge.jpg",
          fileType: "image/jpeg",
          fileSize: 30 * 1024 * 1024
        }
      ] as never,
      0
    );

    expect(result.uploads).toEqual([]);
    expect(result.failed[0]?.error).toContain("Images must be");
  });

  it("reports signed upload failures for listing images", async () => {
    mockGetSignedUploadUrl.mockResolvedValueOnce({
      success: false,
      error: "signing failed"
    });

    const result = await prepareListingImageUploadUrls(
      "u1",
      "l1",
      [
        { id: "1", fileName: "a.jpg", fileType: "image/jpeg", fileSize: 1024 }
      ] as never,
      0
    );

    expect(result.uploads).toEqual([]);
    expect(result.failed).toEqual([
      expect.objectContaining({ error: "signing failed" })
    ]);
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

  it("rejects empty user media uploads and unsupported or oversized files", async () => {
    await expect(prepareUserMediaUploadUrls("u1", [])).rejects.toThrow(
      "No files provided for upload"
    );

    const result = await prepareUserMediaUploadUrls("u1", [
      { id: "1", fileName: "bad.txt", fileType: "text/plain", fileSize: 1 },
      {
        id: "2",
        fileName: "big.jpg",
        fileType: "image/jpeg",
        fileSize: 30 * 1024 * 1024
      },
      {
        id: "3",
        fileName: "big.mp4",
        fileType: "video/mp4",
        fileSize: 600 * 1024 * 1024
      }
    ] as never);

    expect(result.uploads).toEqual([]);
    expect(result.failed).toHaveLength(3);
  });

  it("reports thumbnail signing failures for video uploads", async () => {
    mockGetSignedUploadUrl
      .mockResolvedValueOnce({ success: true, url: "https://signed-video" })
      .mockResolvedValueOnce({ success: false, error: "thumb failed" });

    const result = await prepareUserMediaUploadUrls("u1", [
      { id: "1", fileName: "clip.mp4", fileType: "video/mp4", fileSize: 1024 }
    ] as never);

    expect(result.uploads).toEqual([]);
    expect(result.failed).toEqual([
      expect.objectContaining({ error: "thumb failed" })
    ]);
  });

  it("maps user media record inputs and validates key prefixes", () => {
    const key = getUserMediaPath("u1", "image", "img.jpg");
    const videoKey = getUserMediaPath("u1", "video", "v.mp4");
    const thumb = getUserMediaThumbnailPath("u1", "img.jpg");

    const mapped = mapUserMediaRecordInputs("u1", [
      { type: "image", key },
      { type: "video", key: videoKey, thumbnailKey: thumb, durationSeconds: 4.25 }
    ] as never);

    expect(mapped).toEqual([
      {
        type: "image",
        url: `https://public/${key}`,
        thumbnailUrl: null,
        durationSeconds: null
      },
      {
        type: "video",
        url: `https://public/${videoKey}`,
        thumbnailUrl: `https://public/${thumb}`,
        durationSeconds: 4.25
      }
    ]);

    expect(() =>
      mapUserMediaRecordInputs("u1", [{ type: "image", key: "bad/key" }] as never)
    ).toThrow("Invalid media upload key");

    expect(() =>
      mapUserMediaRecordInputs(
        "u1",
        [{ type: "video", key: videoKey, thumbnailKey: "bad/thumb.jpg" }] as never
      )
    ).toThrow("Invalid media thumbnail upload key");

    const rounded = mapUserMediaRecordInputs("u1", [
      { type: "video", key: videoKey, durationSeconds: 4.257 }
    ] as never);
    expect(rounded[0]?.durationSeconds).toBe(4.26);
  });
});
