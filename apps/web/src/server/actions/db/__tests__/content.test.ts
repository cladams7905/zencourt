const mockInsertReturning = jest.fn();
const mockInsertValues = jest.fn(() => ({ returning: mockInsertReturning }));
const mockInsert = jest.fn(() => ({ values: mockInsertValues }));

const mockUpdateReturning = jest.fn();
const mockUpdateWhere = jest.fn(() => ({ returning: mockUpdateReturning }));
const mockUpdateSet = jest.fn(() => ({ where: mockUpdateWhere }));
const mockUpdate = jest.fn(() => ({ set: mockUpdateSet }));

const mockSelectLimit = jest.fn();
const mockSelectWhere = jest.fn(() => ({ limit: mockSelectLimit }));
const mockSelectFrom = jest.fn(() => ({ where: mockSelectWhere }));
const mockSelect = jest.fn(() => ({ from: mockSelectFrom }));

const mockDeleteWhere = jest.fn();
const mockDelete = jest.fn(() => ({ where: mockDeleteWhere }));

const mockResolvePublicDownloadUrl = jest.fn();
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);
const mockNanoid = jest.fn(() => "generated-id");

jest.mock("nanoid", () => ({ nanoid: () => mockNanoid() }));

jest.mock("@db/client", () => ({
  db: {
    insert: (...args: unknown[]) => ((mockInsert as (...a: unknown[]) => unknown)(...args)),
    update: (...args: unknown[]) => ((mockUpdate as (...a: unknown[]) => unknown)(...args)),
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args)),
    delete: (...args: unknown[]) => ((mockDelete as (...a: unknown[]) => unknown)(...args))
  },
  content: { id: "id", listingId: "listingId" },
  eq: (...args: unknown[]) => args
}));

jest.mock("@web/src/server/actions/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/utils/storageUrls", () => ({
  resolvePublicDownloadUrl: (...args: unknown[]) =>
    ((mockResolvePublicDownloadUrl as (...a: unknown[]) => unknown)(...args))
}));

import {
  createContent,
  deleteContent,
  getContentById,
  updateContent
} from "@web/src/server/actions/db/content";

describe("content actions", () => {
  beforeEach(() => {
    mockInsertReturning.mockReset();
    mockInsertValues.mockClear();
    mockInsert.mockClear();
    mockUpdateReturning.mockReset();
    mockUpdateWhere.mockClear();
    mockUpdateSet.mockClear();
    mockUpdate.mockClear();
    mockSelectLimit.mockReset();
    mockSelectWhere.mockClear();
    mockSelectFrom.mockClear();
    mockSelect.mockClear();
    mockDeleteWhere.mockReset();
    mockDelete.mockClear();
    mockResolvePublicDownloadUrl.mockReset();
    mockWithDbErrorHandling.mockClear();
    mockNanoid.mockClear();
  });

  it("validates required params", async () => {
    await expect(createContent("", { listingId: "l1" } as never)).rejects.toThrow(
      "User ID is required to create content"
    );
    await expect(createContent("u1", { listingId: "" } as never)).rejects.toThrow(
      "Listing ID is required to create content"
    );

    await expect(updateContent("", "c1", {})).rejects.toThrow(
      "User ID is required to update content"
    );
    await expect(deleteContent("u1", "")).rejects.toThrow("Content ID is required");
  });

  it("creates and signs content", async () => {
    mockInsertReturning.mockResolvedValue([{ id: "c1", thumbnailUrl: "raw" }]);
    mockResolvePublicDownloadUrl.mockReturnValue("signed");

    const result = await createContent("u1", { listingId: "l1" } as never);

    expect(mockNanoid).toHaveBeenCalled();
    expect(result).toEqual({ id: "c1", thumbnailUrl: "signed" });
  });

  it("throws when update target not found", async () => {
    mockUpdateReturning.mockResolvedValue([]);
    await expect(updateContent("u1", "c1", {})).rejects.toThrow("Content not found");
  });

  it("returns null when content not found", async () => {
    mockSelectLimit.mockResolvedValue([]);
    await expect(getContentById("u1", "c1")).resolves.toBeNull();
  });

  it("deletes content", async () => {
    mockDeleteWhere.mockResolvedValue(undefined);
    await expect(deleteContent("u1", "c1")).resolves.toBeUndefined();
    expect(mockDelete).toHaveBeenCalled();
  });
});
