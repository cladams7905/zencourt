const mockUploadFile = jest.fn();
const mockUploadFilesBatch = jest.fn();
const mockDeleteFile = jest.fn();
const mockGetSignedDownloadUrl = jest.fn();
const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();

jest.mock("@web/src/server/services/storageService", () => ({
  __esModule: true,
  default: {
    uploadFile: (...args: unknown[]) => mockUploadFile(...args),
    uploadFilesBatch: (...args: unknown[]) => mockUploadFilesBatch(...args),
    deleteFile: (...args: unknown[]) => mockDeleteFile(...args)
  }
}));

jest.mock("@web/src/server/utils/storageUrls", () => ({
  getSignedDownloadUrl: (...args: unknown[]) => mockGetSignedDownloadUrl(...args)
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: (...args: unknown[]) => mockLoggerError(...args)
  })
}));

import {
  deleteFile,
  getSignedDownloadUrl,
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
    mockGetSignedDownloadUrl.mockReset();
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

  it("delegates signed URL generation", async () => {
    mockGetSignedDownloadUrl.mockResolvedValue("signed");
    await expect(getSignedDownloadUrl("u")).resolves.toBe("signed");
  });
});
