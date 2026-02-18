const mockInsertReturning = jest.fn();
const mockInsertOnConflictDoUpdate = jest.fn(() => ({ target: "unused", set: {}, ...{ returning: mockInsertReturning } }));

const mockUserMediaInsertValues = jest.fn(() => ({ returning: mockInsertReturning }));
const mockUserAdditionalValues = jest.fn(() => ({ onConflictDoUpdate: jest.fn() }));
const mockInsert = jest.fn((table: { userId?: string }) => {
  if (table && Object.prototype.hasOwnProperty.call(table, "userId")) {
    return { values: mockUserAdditionalValues };
  }
  return { values: mockUserMediaInsertValues };
});

const mockGetSignedUploadUrl = jest.fn();
const mockBuildPublicUrlForKey = jest.fn((key: string) => `https://public/${key}`);
const mockGetSignedDownloadUrlSafe = jest.fn();
const mockNanoid = jest.fn(() => "media-generated");
const mockWithDbErrorHandling = jest.fn(async (fn: () => Promise<unknown>) => await fn());

jest.mock("nanoid", () => ({ nanoid: () => mockNanoid() }));

jest.mock("@db/client", () => ({
  db: {
    insert: (...args: unknown[]) => ((mockInsert as (...a: unknown[]) => unknown)(...args))
  },
  userMedia: {},
  userAdditional: { userId: "userId" }
}));

jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: {
    getSignedUploadUrl: (...args: unknown[]) => ((mockGetSignedUploadUrl as (...a: unknown[]) => unknown)(...args)),
    buildPublicUrlForKey: (...args: unknown[]) => ((mockBuildPublicUrlForKey as (...a: unknown[]) => unknown)(...args))
  }
}));

jest.mock("@shared/utils/storagePaths", () => ({
  getUserMediaFolder: (userId: string, type: string) => `user_${userId}/media/${type}`,
  getUserMediaThumbnailFolder: (userId: string) => `user_${userId}/media/thumbnails`,
  getUserMediaPath: (userId: string, type: string, fileName: string) =>
    `user_${userId}/media/${type}/${fileName}`,
  getUserMediaThumbnailPath: (userId: string, fileName: string) =>
    `user_${userId}/media/thumbnails/${fileName}.jpg`
}));

jest.mock("@web/src/server/utils/storageUrls", () => ({
  getSignedDownloadUrlSafe: (...args: unknown[]) => ((mockGetSignedDownloadUrlSafe as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/actions/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@shared/utils/mediaUpload";
import {
  createUserMediaRecords,
  getUserMediaUploadUrls
} from "@web/src/server/actions/db/userMedia/uploads";

describe("userMedia uploads", () => {
  beforeEach(() => {
    mockInsertReturning.mockReset();
    mockInsert.mockClear();
    mockUserMediaInsertValues.mockClear();
    mockUserAdditionalValues.mockClear();
    mockGetSignedUploadUrl.mockReset();
    mockBuildPublicUrlForKey.mockClear();
    mockGetSignedDownloadUrlSafe.mockReset();
    mockNanoid.mockClear();
    mockWithDbErrorHandling.mockClear();
  });

  it("validates upload input", async () => {
    await expect(getUserMediaUploadUrls("", [])).rejects.toThrow(
      "User ID is required to upload media"
    );

    await expect(getUserMediaUploadUrls("u1", [])).rejects.toThrow(
      "No files provided for upload"
    );
  });

  it("returns failed entries for unsupported type and oversize files", async () => {
    const result = await getUserMediaUploadUrls("u1", [
      { id: "bad", fileName: "doc.pdf", fileType: "application/pdf", fileSize: 1 },
      {
        id: "img-big",
        fileName: "big.jpg",
        fileType: "image/jpeg",
        fileSize: MAX_IMAGE_BYTES + 1
      },
      {
        id: "vid-big",
        fileName: "big.mp4",
        fileType: "video/mp4",
        fileSize: MAX_VIDEO_BYTES + 1
      }
    ]);

    expect(result.uploads).toEqual([]);
    expect(result.failed).toHaveLength(3);
  });

  it("builds image and video upload URLs", async () => {
    mockGetSignedUploadUrl
      .mockResolvedValueOnce({ success: true, url: "https://signed-image" })
      .mockResolvedValueOnce({ success: true, url: "https://signed-video" })
      .mockResolvedValueOnce({ success: true, url: "https://signed-thumb" });

    const result = await getUserMediaUploadUrls("u1", [
      { id: "img", fileName: "a.jpg", fileType: "image/jpeg", fileSize: 100 },
      { id: "vid", fileName: "a.mp4", fileType: "video/mp4", fileSize: 100 }
    ]);

    expect(result.failed).toEqual([]);
    expect(result.uploads).toEqual([
      expect.objectContaining({ id: "img", type: "image", uploadUrl: "https://signed-image" }),
      expect.objectContaining({
        id: "vid",
        type: "video",
        uploadUrl: "https://signed-video",
        thumbnailUploadUrl: "https://signed-thumb"
      })
    ]);
  });

  it("returns empty array when no records are provided", async () => {
    await expect(createUserMediaRecords("u1", [])).resolves.toEqual([]);
  });

  it("validates media key prefixes", async () => {
    await expect(
      createUserMediaRecords("u1", [
        { type: "image", key: "wrong/key" }
      ])
    ).rejects.toThrow("Invalid media upload key");

    await expect(
      createUserMediaRecords("u1", [
        {
          type: "video",
          key: "user_u1/media/video/a.mp4",
          thumbnailKey: "wrong/thumb"
        }
      ])
    ).rejects.toThrow("Invalid media thumbnail upload key");
  });

  it("creates records and signs urls", async () => {
    mockInsertReturning.mockResolvedValueOnce([
      { id: "media-generated", url: "https://public/user_u1/media/image/a.jpg", thumbnailUrl: null }
    ]);
    mockGetSignedDownloadUrlSafe
      .mockResolvedValueOnce("https://signed/user_u1/media/image/a.jpg")
      .mockResolvedValueOnce(null);

    const result = await createUserMediaRecords("u1", [
      {
        type: "image",
        key: "user_u1/media/image/a.jpg"
      }
    ]);

    expect(result).toEqual([
      {
        id: "media-generated",
        url: "https://signed/user_u1/media/image/a.jpg",
        thumbnailUrl: null
      }
    ]);
    expect(mockInsert).toHaveBeenCalledTimes(2);
  });
});
