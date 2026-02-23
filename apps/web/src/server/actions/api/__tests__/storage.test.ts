const mockUploadFile = jest.fn();
const mockUploadFilesBatch = jest.fn();
const mockDeleteFile = jest.fn();
const mockGetPublicDownloadUrl = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: {
    uploadFile: (...args: unknown[]) => ((mockUploadFile as (...a: unknown[]) => unknown)(...args)),
    uploadFilesBatch: (...args: unknown[]) => ((mockUploadFilesBatch as (...a: unknown[]) => unknown)(...args)),
    deleteFile: (...args: unknown[]) => ((mockDeleteFile as (...a: unknown[]) => unknown)(...args))
  }
}));

jest.mock("@web/src/server/utils/storageUrls", () => ({
  getPublicDownloadUrl: (...args: unknown[]) => ((mockGetPublicDownloadUrl as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    info: (...args: unknown[]) => ((mockLoggerInfo as (...a: unknown[]) => unknown)(...args)),
    error: (...args: unknown[]) => ((mockLoggerError as (...a: unknown[]) => unknown)(...args))
  })
}));

import {
  deleteFile,
  getPublicDownloadUrl,
  uploadFile,
  uploadFilesBatch
} from "@web/src/server/actions/api/storage";

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
    mockGetPublicDownloadUrl.mockReset();
    mockLoggerInfo.mockReset();
    mockLoggerError.mockReset();
  });

  it("uploads a single file", async () => {
    mockUploadFile.mockResolvedValue({ success: true, url: "https://x" });

    const file = makeMockFile();
    const url = await uploadFile(file, "folder");

    expect(url).toBe("https://x");
    expect(mockUploadFile).toHaveBeenCalled();
  });

  it("returns failed batch payload on error", async () => {
    mockUploadFilesBatch.mockResolvedValue({ success: false, error: "bad" });

    const file = makeMockFile();
    const result = await uploadFilesBatch([file], "folder");

    expect(result.success).toBe(false);
    expect(result.error).toContain("bad");
  });

  it("deletes file or throws", async () => {
    mockDeleteFile.mockResolvedValue({ success: true });
    await expect(deleteFile("https://x")).resolves.toBeUndefined();

    mockDeleteFile.mockResolvedValueOnce({ success: false, error: "nope" });
    await expect(deleteFile("https://x")).rejects.toThrow("Failed to delete file");
  });

  it("delegates public URL resolution", async () => {
    mockGetPublicDownloadUrl.mockReturnValue("https://cdn.example.com/u");
    await expect(getPublicDownloadUrl("u")).resolves.toBe("https://cdn.example.com/u");
  });
});
