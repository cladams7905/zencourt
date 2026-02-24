const mockSelectWhere = jest.fn();
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

const mockInsertReturning = jest.fn();
const mockInsertOnConflictDoUpdate = jest.fn(() => ({ returning: mockInsertReturning }));
const mockInsertValues = jest.fn(() => ({ onConflictDoUpdate: mockInsertOnConflictDoUpdate }));
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockUploadFile = jest.fn();
const mockWithDbErrorHandling = jest.fn(async (fn: () => Promise<unknown>) => await fn());

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args)),
    insert: (...args: unknown[]) => ((mockInsert as (...a: unknown[]) => unknown)(...args))
  },
  userAdditional: { userId: "userId", headshotUrl: "headshotUrl" },
  eq: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/services/storage", () => ({
  __esModule: true,
  default: {
    uploadFile: (...args: unknown[]) => ((mockUploadFile as (...a: unknown[]) => unknown)(...args))
  }
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

import { ensureGoogleHeadshot } from "@web/src/server/models/userAdditional/media";

describe("userAdditional media", () => {
  beforeEach(() => {
    mockSelectWhere.mockReset();
    mockSelectFrom.mockClear();
    mockSelect.mockClear();
    mockInsertReturning.mockReset();
    mockInsertOnConflictDoUpdate.mockClear();
    mockInsertValues.mockClear();
    mockInsert.mockClear();
    mockUploadFile.mockReset();
    mockWithDbErrorHandling.mockClear();
    global.fetch = jest.fn();
  });

  it("validates user id and handles empty google image url", async () => {
    await expect(ensureGoogleHeadshot("", "https://img")).rejects.toThrow(
      "User ID is required to update headshot"
    );
    await expect(ensureGoogleHeadshot("u1", "")).resolves.toBeNull();
  });

  it("returns existing headshot when present", async () => {
    mockSelectWhere.mockResolvedValueOnce([{ headshotUrl: "https://existing" }]);

    await expect(ensureGoogleHeadshot("u1", "https://google")).resolves.toBe(
      "https://existing"
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("downloads, uploads, and saves google headshot", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      headers: { get: () => "image/png" },
      arrayBuffer: async () => new Uint8Array([1, 2]).buffer
    });
    mockUploadFile.mockResolvedValueOnce({ success: true, url: "https://stored" });
    mockInsertReturning.mockResolvedValueOnce([{ headshotUrl: "https://stored" }]);

    await expect(ensureGoogleHeadshot("u1", "https://google")).resolves.toBe(
      "https://stored"
    );
  });

  it("throws when remote headshot cannot be downloaded", async () => {
    mockSelectWhere.mockResolvedValueOnce([]);
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, headers: { get: () => null } });

    await expect(ensureGoogleHeadshot("u1", "https://google")).rejects.toThrow(
      "Failed to download Google headshot"
    );
  });
});
