const mockSend = jest.fn();
const mockGetSignedUrl = jest.fn();
const mockExtractStorageKeyFromUrl = jest.fn();
const mockBuildStoragePublicUrl = jest.fn();

const mockPutObjectCommand = jest.fn();
const mockDeleteObjectCommand = jest.fn();
const mockGetObjectCommand = jest.fn();
const mockListObjectVersionsCommand = jest.fn();

jest.mock("@aws-sdk/client-s3", () => ({
  PutObjectCommand: class PutObjectCommandMock {
    public readonly __type = "PutObjectCommand";
    constructor(public readonly input: unknown) {
      mockPutObjectCommand(input);
    }
  },
  DeleteObjectCommand: class DeleteObjectCommandMock {
    public readonly __type = "DeleteObjectCommand";
    constructor(public readonly input: unknown) {
      mockDeleteObjectCommand(input);
    }
  },
  GetObjectCommand: class GetObjectCommandMock {
    public readonly __type = "GetObjectCommand";
    constructor(public readonly input: unknown) {
      mockGetObjectCommand(input);
    }
  },
  ListObjectVersionsCommand: class ListObjectVersionsCommandMock {
    public readonly __type = "ListObjectVersionsCommand";
    constructor(public readonly input: unknown) {
      mockListObjectVersionsCommand(input);
    }
  },
  S3Client: jest.fn(() => ({ send: (...args: unknown[]) => mockSend(...args) })),
}));

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => mockGetSignedUrl(...args)
}));

jest.mock("@shared/utils", () => ({
  getListingImagePath: jest.fn(
    (userId: string, listingId: string, fileName: string) =>
      `user_${userId}/listings/listing_${listingId}/${fileName}`
  ),
  getGenericUploadPath: jest.fn(
    (folder: string, fileName: string) => `${folder}/${fileName}`
  ),
  extractStorageKeyFromUrl: (...args: unknown[]) => mockExtractStorageKeyFromUrl(...args),
  buildStorageConfigFromEnv: jest.fn(() => ({
    region: "us-west-002",
    bucket: "bucket",
    endpoint: "https://storage.example.com",
    publicBaseUrl: "https://cdn.example.com",
    keyId: "key",
    applicationKey: "secret"
  })),
  buildStoragePublicUrl: (...args: unknown[]) => mockBuildStoragePublicUrl(...args)
}));

import { StorageService } from "../service";

function createService() {
  return new StorageService({
    client: { send: (...args: unknown[]) => mockSend(...args) } as never,
    config: {
      region: "us-west-002",
      bucket: "bucket",
      endpoint: "https://storage.example.com",
      publicBaseUrl: "https://cdn.example.com",
      keyId: "key",
      applicationKey: "secret"
    },
    logger: {
      info: jest.fn(),
      error: jest.fn()
    },
    now: () => new Date("2026-02-18T12:00:00.000Z")
  });
}

function toArrayBuffer(value: string): ArrayBuffer {
  return Uint8Array.from(value.split("").map((char) => char.charCodeAt(0))).buffer;
}

describe("storage/service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBuildStoragePublicUrl.mockImplementation(
      (_base: string, bucket: string, key: string) => `https://cdn.example.com/${bucket}/${key}`
    );
    mockExtractStorageKeyFromUrl.mockImplementation(
      (url: string) => url.replace("https://cdn.example.com/", "")
    );
  });

  it("uploads a single file and returns key/url", async () => {
    mockSend.mockResolvedValue({});
    const service = createService();

    const result = await service.uploadFile({
      fileBuffer: toArrayBuffer("hello"),
      fileName: "kitchen.jpg",
      contentType: "image/jpeg",
      options: {
        userId: "u1",
        listingId: "l1"
      }
    });

    expect(result).toEqual({
      success: true,
      key: "user_u1/listings/listing_l1/kitchen.jpg",
      url: "https://cdn.example.com/bucket/user_u1/listings/listing_l1/kitchen.jpg"
    });
    expect(mockPutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: "bucket",
        Key: "user_u1/listings/listing_l1/kitchen.jpg",
        ContentType: "image/jpeg",
        Metadata: expect.objectContaining({
          originalName: "kitchen.jpg",
          uploadedAt: "2026-02-18T12:00:00.000Z",
          userId: "u1",
          listingId: "l1"
        })
      })
    );
  });

  it("returns error response when upload fails", async () => {
    mockSend.mockRejectedValue(new Error("upload failed"));
    const service = createService();

    await expect(
      service.uploadFile({
        fileBuffer: toArrayBuffer("hello"),
        fileName: "kitchen.jpg",
        contentType: "image/jpeg"
      })
    ).resolves.toEqual({
      success: false,
      key: null,
      url: null,
      error: "upload failed"
    });
  });

  it("uploads files in batch and aggregates failures", async () => {
    mockSend.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("boom"));
    const service = createService();

    const result = await service.uploadFilesBatch([
      {
        fileBuffer: toArrayBuffer("ok"),
        fileName: "ok.jpg",
        contentType: "image/jpeg"
      },
      {
        fileBuffer: toArrayBuffer("bad"),
        fileName: "bad.jpg",
        contentType: "image/jpeg"
      }
    ]);

    expect(result.success).toBe(false);
    expect(result.error).toContain("bad.jpg: boom");
    expect(result.results).toHaveLength(2);
  });

  it("generates signed upload and download URLs", async () => {
    mockGetSignedUrl
      .mockResolvedValueOnce("https://signed-upload")
      .mockResolvedValueOnce("https://signed-download");
    const service = createService();

    await expect(service.getSignedUploadUrl("folder/file.jpg", "image/jpeg")).resolves.toEqual({
      success: true,
      url: "https://signed-upload"
    });

    mockExtractStorageKeyFromUrl.mockReturnValue("bucket/folder/file.jpg");
    await expect(
      service.getSignedDownloadUrl("https://cdn.example.com/bucket/folder/file.jpg")
    ).resolves.toEqual({
      success: true,
      url: "https://signed-download"
    });

    expect(mockGetObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: "folder/file.jpg" })
    );
  });

  it("returns errors when signed URL generation fails", async () => {
    mockGetSignedUrl
      .mockRejectedValueOnce(new Error("upload sign failed"))
      .mockRejectedValueOnce(new Error("download sign failed"));
    const service = createService();

    await expect(
      service.getSignedUploadUrl("folder/file.jpg", "image/jpeg")
    ).resolves.toEqual({
      success: false,
      error: "upload sign failed"
    });

    await expect(service.getSignedDownloadUrl("folder/file.jpg")).resolves.toEqual(
      {
        success: false,
        error: "download sign failed"
      }
    );
  });

  it("deletes bare object when there are no version entries", async () => {
    mockExtractStorageKeyFromUrl.mockReturnValue("bucket/folder/file.jpg");
    mockSend
      .mockResolvedValueOnce({
        Versions: [],
        DeleteMarkers: [],
        NextKeyMarker: undefined
      })
      .mockResolvedValueOnce({});
    const service = createService();

    await expect(
      service.deleteFile("https://cdn.example.com/bucket/folder/file.jpg")
    ).resolves.toEqual({ success: true });

    expect(mockDeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Bucket: "bucket", Key: "folder/file.jpg" })
    );
  });

  it("deletes all versions and delete markers when present", async () => {
    mockExtractStorageKeyFromUrl.mockReturnValue("bucket/folder/file.jpg");
    mockSend
      .mockResolvedValueOnce({
        Versions: [{ Key: "folder/file.jpg", VersionId: "v1" }],
        DeleteMarkers: [{ Key: "folder/file.jpg", VersionId: "d1" }],
        NextKeyMarker: "next-key",
        NextVersionIdMarker: "next-version"
      })
      .mockResolvedValueOnce({
        Versions: [{ Key: "folder/file.jpg", VersionId: "v2" }],
        DeleteMarkers: [],
        NextKeyMarker: undefined
      })
      .mockResolvedValue({});
    const service = createService();

    await expect(
      service.deleteFile("https://cdn.example.com/bucket/folder/file.jpg")
    ).resolves.toEqual({ success: true });

    const deletes = mockDeleteObjectCommand.mock.calls.map((call) => call[0]);
    expect(deletes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ Key: "folder/file.jpg", VersionId: "v1" }),
        expect.objectContaining({ Key: "folder/file.jpg", VersionId: "d1" }),
        expect.objectContaining({ Key: "folder/file.jpg", VersionId: "v2" })
      ])
    );
  });

  it("returns delete error response when deletion fails", async () => {
    mockExtractStorageKeyFromUrl.mockImplementation(() => {
      throw new Error("bad url");
    });
    const service = createService();

    await expect(service.deleteFile("not-a-url")).resolves.toEqual({
      success: false,
      error: "bad url"
    });
  });
});
