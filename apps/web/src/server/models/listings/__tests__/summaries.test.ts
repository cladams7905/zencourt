const mockSelect = jest.fn();
const mockWithDbErrorHandling = jest.fn(
  async (fn: () => Promise<unknown>) => await fn()
);
const mockWithSignedContentThumbnails = jest.fn();
const mockSignUrlArray = jest.fn();
const mockResolvePublicDownloadUrl = jest.fn();

jest.mock("@db/client", () => ({
  db: {
    select: (...args: unknown[]) => ((mockSelect as (...a: unknown[]) => unknown)(...args))
  },
  listings: {
    id: "id",
    userId: "userId",
    title: "title",
    listingStage: "listingStage",
    lastOpenedAt: "lastOpenedAt",
    createdAt: "createdAt"
  },
  listingImages: {
    id: "id",
    listingId: "listingId",
    url: "url",
    isPrimary: "isPrimary",
    uploadedAt: "uploadedAt"
  },
  content: {
    id: "id",
    listingId: "listingId"
  },
  eq: (...args: unknown[]) => args,
  inArray: (...args: unknown[]) => args,
  desc: (...args: unknown[]) => args,
  sql: (...args: unknown[]) => ({
    args,
    mapWith: () => 0
  })
}));

jest.mock("@web/src/server/models/shared/dbErrorHandling", () => ({
  withDbErrorHandling: (...args: unknown[]) => ((mockWithDbErrorHandling as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/models/listings/helpers", () => ({
  withSignedContentThumbnails: (...args: unknown[]) => ((mockWithSignedContentThumbnails as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/models/shared/urlSigning", () => ({
  signUrlArray: (...args: unknown[]) => ((mockSignUrlArray as (...a: unknown[]) => unknown)(...args))
}));

jest.mock("@web/src/server/utils/storageUrls", () => ({
  resolvePublicDownloadUrl: (...args: unknown[]) =>
    ((mockResolvePublicDownloadUrl as (...a: unknown[]) => unknown)(...args))
}));

import {
  getUserListingSummariesPage,
  getUserListings
} from "@web/src/server/models/listings/summaries";

function makeOrderByResolvingBuilder(rows: unknown[]) {
  const builder = {
    from: jest.fn(),
    leftJoin: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn()
  } as Record<string, jest.Mock>;

  builder.from.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.orderBy.mockResolvedValue(rows);

  return builder;
}

function makePagedSummaryBuilder(rows: unknown[]) {
  const builder = {
    from: jest.fn(),
    leftJoin: jest.fn(),
    where: jest.fn(),
    groupBy: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
    offset: jest.fn()
  } as Record<string, jest.Mock>;

  builder.from.mockReturnValue(builder);
  builder.leftJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.groupBy.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.offset.mockResolvedValue(rows);

  return builder;
}

describe("listings summaries", () => {
  beforeEach(() => {
    mockSelect.mockReset();
    mockWithDbErrorHandling.mockClear();
    mockWithSignedContentThumbnails.mockReset();
    mockSignUrlArray.mockReset();
    mockResolvePublicDownloadUrl.mockReset();
  });

  it("validates user id", async () => {
    await expect(getUserListings(" ")).rejects.toThrow(
      "User ID is required to fetch listings"
    );
    await expect(getUserListingSummariesPage("")).rejects.toThrow(
      "User ID is required to fetch listings"
    );
  });

  it("returns signed user listings", async () => {
    const rows = [
      {
        listing: { id: "l1", createdAt: "2025-01-01", lastOpenedAt: null },
        content: { id: "c1", updatedAt: "2025-01-02", thumbnailUrl: "thumb-1" }
      },
      {
        listing: { id: "l1", createdAt: "2025-01-01", lastOpenedAt: null },
        content: { id: "c2", updatedAt: "2025-01-03", thumbnailUrl: "thumb-2" }
      }
    ];

    mockSelect.mockReturnValueOnce(makeOrderByResolvingBuilder(rows));
    mockWithSignedContentThumbnails.mockResolvedValueOnce([{ id: "c1" }, { id: "c2" }]);
    mockResolvePublicDownloadUrl.mockReturnValueOnce("public-thumbnail");

    const result = await getUserListings("u1");

    expect(mockWithSignedContentThumbnails).toHaveBeenCalledWith([
      { id: "c1", updatedAt: "2025-01-02", thumbnailUrl: "thumb-1" },
      { id: "c2", updatedAt: "2025-01-03", thumbnailUrl: "thumb-2" }
    ]);
    expect(result).toEqual([
      expect.objectContaining({
        id: "l1",
        primaryContentId: "c2",
        thumbnailUrl: "public-thumbnail",
        contents: [{ id: "c1" }, { id: "c2" }]
      })
    ]);
  });

  it("returns paginated summary previews", async () => {
    const pageRows = [
      {
        id: "l1",
        title: "Draft 1",
        listingStage: null,
        lastOpenedAt: null,
        createdAt: "2025-01-01",
        imageCount: 2
      },
      {
        id: "l2",
        title: "Draft 2",
        listingStage: null,
        lastOpenedAt: null,
        createdAt: "2025-01-01",
        imageCount: Number.NaN
      }
    ];

    mockSelect
      .mockReturnValueOnce(makePagedSummaryBuilder([...pageRows, { id: "extra" }]))
      .mockReturnValueOnce(
        makeOrderByResolvingBuilder([
          {
            listingId: "l1",
            url: "img-1",
            isPrimary: true,
            uploadedAt: "2025-01-01"
          },
          {
            listingId: "l1",
            url: "img-2",
            isPrimary: false,
            uploadedAt: "2024-12-31"
          }
        ])
      );

    mockResolvePublicDownloadUrl
      .mockReturnValueOnce("signed-1")
      .mockReturnValueOnce("signed-2");

    const result = await getUserListingSummariesPage("u1", { limit: 2, offset: 0 });

    expect(result.hasMore).toBe(true);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: "l1",
        imageCount: 2,
        previewImages: ["signed-1", "signed-2"]
      }),
      expect.objectContaining({
        id: "l2",
        imageCount: 0,
        previewImages: []
      })
    ]);
  });
});
