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

jest.mock("@web/src/server/auth/apiAuth", () => ({
  requireAuthenticatedUser: (...args: unknown[]) =>
    (mockRequireAuthenticatedUser as (...a: unknown[]) => unknown)(...args)
}));

import {
  deleteFile,
  uploadFile,
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

});
