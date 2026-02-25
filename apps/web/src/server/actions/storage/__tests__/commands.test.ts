const mockUploadFile = jest.fn();
const mockUploadFilesBatch = jest.fn();
const mockDeleteFile = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
const mockRequireAuthenticatedUser = jest.fn();

jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: {
    uploadFile: (...args: unknown[]) => ((mockUploadFile as (...a: unknown[]) => unknown)(...args)),
    uploadFilesBatch: (...args: unknown[]) => ((mockUploadFilesBatch as (...a: unknown[]) => unknown)(...args)),
    deleteFile: (...args: unknown[]) => ((mockDeleteFile as (...a: unknown[]) => unknown)(...args))
  }
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    info: (...args: unknown[]) => ((mockLoggerInfo as (...a: unknown[]) => unknown)(...args)),
    error: (...args: unknown[]) => ((mockLoggerError as (...a: unknown[]) => unknown)(...args))
  })
}));

jest.mock("@web/src/server/actions/_auth/api", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

import {
  deleteFile,
  uploadFile,
  uploadFileFromBuffer,
  uploadCurrentUserBrandingAssetFromBuffer,
  uploadFilesBatch
} from "@web/src/server/actions/storage/commands";

function makeMockFile(name = "a.txt", type = "text/plain"): File {
  return {
    name,
    type,
    arrayBuffer: async () => new Uint8Array([120]).buffer
  } as unknown as File;
}

describe("storage actions", () => {
  beforeEach(() => {
    mockUploadFile.mockReset();
    mockUploadFilesBatch.mockReset();
    mockDeleteFile.mockReset();
    mockLoggerInfo.mockReset();
    mockLoggerError.mockReset();
    mockRequireAuthenticatedUser.mockReset();
    mockRequireAuthenticatedUser.mockResolvedValue({ id: "user-1" });
  });

  it("uploads a single file", async () => {
    mockUploadFile.mockResolvedValue({ success: true, url: "https://x" });

    const file = makeMockFile();
    const url = await uploadFile(file, "folder");

    expect(url).toBe("https://x");
    expect(mockUploadFile).toHaveBeenCalled();
  });

  it("wraps uploadFile failures with filename context", async () => {
    mockUploadFile.mockResolvedValue({ success: false, error: "upload failed" });
    const file = makeMockFile("photo.png", "image/png");

    await expect(uploadFile(file, "folder")).rejects.toThrow(
      "Failed to upload photo.png: upload failed"
    );
  });

  it("supports uploadFileFromBuffer and user branding upload", async () => {
    mockUploadFile.mockResolvedValueOnce({ success: true, url: "https://buf" });
    const url = await uploadFileFromBuffer({
      fileBuffer: new Uint8Array([1, 2, 3]).buffer,
      fileName: "x.bin",
      contentType: "application/octet-stream",
      folder: "folder-a"
    });
    expect(url).toBe("https://buf");
    expect(mockUploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileName: "x.bin",
        contentType: "application/octet-stream",
        options: { folder: "folder-a" }
      })
    );

    mockUploadFile.mockResolvedValueOnce({ success: true, url: "https://brand" });
    const brandingUrl = await uploadCurrentUserBrandingAssetFromBuffer({
      fileBuffer: new Uint8Array([9]).buffer,
      fileName: "logo.png",
      contentType: "image/png"
    });
    expect(brandingUrl).toBe("https://brand");
    expect(mockUploadFile).toHaveBeenLastCalledWith(
      expect.objectContaining({
        fileName: "logo.png",
        options: { folder: "user_user-1/branding" }
      })
    );
  });

  it("throws on batch upload failure", async () => {
    mockUploadFilesBatch.mockResolvedValue({ success: false, error: "bad" });

    const file = makeMockFile();
    await expect(uploadFilesBatch([file], "folder")).rejects.toThrow("bad");
  });

  it("deletes file or throws", async () => {
    mockDeleteFile.mockResolvedValue({ success: true });
    await expect(deleteFile("https://x")).resolves.toBeUndefined();

    mockDeleteFile.mockResolvedValueOnce({ success: false, error: "nope" });
    await expect(deleteFile("https://x")).rejects.toThrow("Failed to delete file");
  });

  it("wraps unknown delete errors", async () => {
    mockDeleteFile.mockRejectedValueOnce("nope");
    await expect(deleteFile("https://x")).rejects.toThrow(
      "Failed to delete file: Unknown error"
    );
  });

  it("returns batch result on success", async () => {
    mockUploadFilesBatch.mockResolvedValue({
      success: true,
      files: [{ url: "https://x" }]
    });
    const result = await uploadFilesBatch([makeMockFile()], "folder", "u1", "l1");
    expect(result).toEqual({
      success: true,
      files: [{ url: "https://x" }]
    });
    expect(mockLoggerInfo).toHaveBeenCalled();
  });

  it("wraps unknown errors in uploadFilesBatch", async () => {
    mockUploadFilesBatch.mockRejectedValue("bad");
    await expect(uploadFilesBatch([makeMockFile()], "folder")).rejects.toThrow(
      "Unknown error"
    );
  });

  it("requires authenticated user before storage operations", async () => {
    mockRequireAuthenticatedUser.mockRejectedValueOnce(new Error("auth required"));
    await expect(uploadFile(makeMockFile(), "folder")).rejects.toThrow(
      "auth required"
    );
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("throws when trusted upload returns missing url", async () => {
    mockUploadFile.mockResolvedValueOnce({ success: true, url: null, error: "bad" });
    await expect(
      uploadFileFromBuffer({
        fileBuffer: new Uint8Array([1]).buffer,
        fileName: "x.bin",
        contentType: "application/octet-stream",
        folder: "folder-a"
      })
    ).rejects.toThrow("bad");
  });

});
