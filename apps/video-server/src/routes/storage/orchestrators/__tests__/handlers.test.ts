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
    getSignedDownloadUrl: jest.fn().mockResolvedValue("https://signed/file.jpg"),
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
    expect(storage.getSignedDownloadUrl).toHaveBeenCalled();
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
      signedUrl: "https://signed/file.jpg",
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
});
