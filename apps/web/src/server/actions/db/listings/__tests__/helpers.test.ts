const mockResolveSignedDownloadUrl = jest.fn();

jest.mock("@web/src/server/utils/storageUrls", () => ({
  DEFAULT_THUMBNAIL_TTL_SECONDS: 3600,
  resolveSignedDownloadUrl: (...args: unknown[]) => ((mockResolveSignedDownloadUrl as (...a: unknown[]) => unknown)(...args))
}));

import { withSignedContentThumbnails } from "@web/src/server/actions/db/listings/helpers";

describe("listings helpers", () => {
  beforeEach(() => {
    mockResolveSignedDownloadUrl.mockReset();
  });

  it("returns early for empty lists", async () => {
    await expect(withSignedContentThumbnails([])).resolves.toEqual([]);
    expect(mockResolveSignedDownloadUrl).not.toHaveBeenCalled();
  });

  it("signs each thumbnail url", async () => {
    mockResolveSignedDownloadUrl
      .mockResolvedValueOnce("signed-1")
      .mockResolvedValueOnce("signed-2");

    const result = await withSignedContentThumbnails([
      { id: "c1", thumbnailUrl: "raw-1" },
      { id: "c2", thumbnailUrl: "raw-2" }
    ] as never);

    expect(result).toEqual([
      { id: "c1", thumbnailUrl: "signed-1" },
      { id: "c2", thumbnailUrl: "signed-2" }
    ]);
  });
});
