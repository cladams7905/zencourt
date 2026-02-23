import {
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";
import {
  handleBatchUpload,
  handleDeleteByUrl,
  handleSignedUrlRequest,
  handleSingleUpload
} from "@/routes/storage/orchestrators/handlers";

function makeFile(name: string): Express.Multer.File {
  return {
    fieldname: "file",
    originalname: name,
    encoding: "7bit",
    mimetype: "image/jpeg",
    size: 3,
    buffer: Buffer.from("abc"),
    stream: null as never,
    destination: "",
    filename: name,
    path: ""
  };
}

describe("storage orchestrators", () => {
  const storage = {
    uploadFile: jest.fn().mockResolvedValue("https://cdn/file.jpg"),
    getPublicUrlForKey: jest.fn().mockReturnValue("https://cdn/file.jpg"),
    extractKeyFromUrl: jest.fn().mockReturnValue("key/file.jpg"),
    deleteFile: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles single upload", async () => {
    const result = await handleSingleUpload(
      {
        file: makeFile("a.jpg"),
        folder: "uploads"
      },
      storage
    );
    expect(result.success).toBe(true);
    expect(storage.uploadFile).toHaveBeenCalled();
    expect(storage.getPublicUrlForKey).toHaveBeenCalled();
  });

  it("handles delete by url", async () => {
    const result = await handleDeleteByUrl("https://cdn/key/file.jpg", storage);
    expect(result).toEqual({ success: true });
    expect(storage.extractKeyFromUrl).toHaveBeenCalled();
    expect(storage.deleteFile).toHaveBeenCalledWith("", "key/file.jpg");
  });

  it("handles signed url request", async () => {
    const result = await handleSignedUrlRequest("key/a.jpg", 120, storage);
    expect(result).toEqual({
      success: true,
      signedUrl: "https://cdn/file.jpg",
      expiresIn: 120
    });
  });

  it("handles batch upload", async () => {
    const result = await handleBatchUpload(
      {
        files: [makeFile("a.jpg"), makeFile("b.jpg")],
        folder: "uploads"
      },
      storage
    );
    expect(result.success).toBe(true);
    expect(result.totalFiles).toBe(2);
  });

  it("wraps upload error in VideoProcessingError", async () => {
    const failingStorage = {
      ...storage,
      uploadFile: jest.fn().mockRejectedValue(new Error("S3 unavailable")),
      getPublicUrlForKey: jest.fn()
    };

    await expect(
      handleSingleUpload({ file: makeFile("a.jpg"), folder: "uploads" }, failingStorage)
    ).rejects.toThrow("Failed to upload file to storage");
  });

  it("wraps delete error in VideoProcessingError", async () => {
    const failingStorage = {
      ...storage,
      deleteFile: jest.fn().mockRejectedValue(new Error("S3 unavailable"))
    };

    await expect(
      handleDeleteByUrl("https://cdn/key/file.jpg", failingStorage)
    ).rejects.toThrow("Failed to delete file from storage");
  });

  it("wraps signed URL error in VideoProcessingError", async () => {
    const failingStorage = {
      ...storage,
      getPublicUrlForKey: jest.fn().mockImplementation(() => {
        throw new Error("S3 unavailable");
      })
    };

    await expect(
      handleSignedUrlRequest("key/a.jpg", 120, failingStorage)
    ).rejects.toThrow("Failed to generate signed URL");
  });

  it("handles batch upload with partial failure", async () => {
    const partialStorage = {
      ...storage,
      uploadFile: jest
        .fn()
        .mockResolvedValueOnce("https://cdn/a.jpg")
        .mockRejectedValueOnce(new Error("upload failed"))
    };

    const result = await handleBatchUpload(
      { files: [makeFile("a.jpg"), makeFile("b.jpg")], folder: "uploads" },
      partialStorage
    );

    expect(result.success).toBe(true);
    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(1);
  });

  it("uses userId/listingId key path when provided in upload", async () => {
    await handleSingleUpload(
      { file: makeFile("a.jpg"), folder: "uploads", userId: "u1", listingId: "l1" },
      storage
    );

    const uploadCall = storage.uploadFile.mock.calls[0][0];
    expect(uploadCall.key).toContain("user_u1");
  });

  it("rethrows VideoProcessingError when single upload storage throws it", async () => {
    const vpe = new VideoProcessingError(
      "Storage quota exceeded",
      VideoProcessingErrorType.STORAGE_UPLOAD_FAILED
    );
    const failingStorage = {
      ...storage,
      uploadFile: jest.fn().mockRejectedValue(vpe),
      getPublicUrlForKey: jest.fn()
    };

    await expect(
      handleSingleUpload({ file: makeFile("a.jpg"), folder: "uploads" }, failingStorage)
    ).rejects.toThrow(vpe);
  });

  it("rethrows VideoProcessingError when delete storage throws it", async () => {
    const vpe = new VideoProcessingError(
      "File not found",
      VideoProcessingErrorType.STORAGE_NOT_FOUND
    );
    const failingStorage = {
      ...storage,
      extractKeyFromUrl: jest.fn().mockReturnValue("key/file.jpg"),
      deleteFile: jest.fn().mockRejectedValue(vpe)
    };

    await expect(
      handleDeleteByUrl("https://cdn/key/file.jpg", failingStorage)
    ).rejects.toThrow(vpe);
  });

  it("rethrows VideoProcessingError when signed URL storage throws it", async () => {
    const vpe = new VideoProcessingError(
      "Key not found",
      VideoProcessingErrorType.STORAGE_DOWNLOAD_FAILED
    );
    const failingStorage = {
      ...storage,
      getPublicUrlForKey: jest.fn().mockImplementation(() => {
        throw vpe;
      })
    };

    await expect(
      handleSignedUrlRequest("key/a.jpg", 120, failingStorage)
    ).rejects.toThrow(vpe);
  });

  it("wraps batch upload error when input.files is invalid", async () => {
    const invalidInput = { files: null, folder: "uploads" } as never;

    await expect(handleBatchUpload(invalidInput, storage)).rejects.toThrow(
      "Failed to batch upload files to storage"
    );
  });

  it("uses generic key path when batch upload has folder only", async () => {
    const result = await handleBatchUpload(
      {
        files: [makeFile("a.jpg")],
        folder: "generic-uploads"
      },
      storage
    );

    expect(result.success).toBe(true);
    const uploadCall = storage.uploadFile.mock.calls[0][0];
    expect(uploadCall.key).not.toContain("user_");
    expect(uploadCall.key).toContain("generic-uploads");
  });
});
