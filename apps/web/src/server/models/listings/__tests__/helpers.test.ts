const mockResolvePublicDownloadUrl = jest.fn();

jest.mock("@web/src/server/utils/storageUrls", () => ({
  resolvePublicDownloadUrl: (...args: unknown[]) =>
    ((mockResolvePublicDownloadUrl as (...a: unknown[]) => unknown)(...args))
}));

import { withSignedContentThumbnails } from "@web/src/server/models/listings/helpers";

describe("listings helpers", () => {
  beforeEach(() => {
    mockResolvePublicDownloadUrl.mockReset();
  });

  it("returns early for empty lists", async () => {
    await expect(withSignedContentThumbnails([])).resolves.toEqual([]);
    expect(mockResolvePublicDownloadUrl).not.toHaveBeenCalled();
  });

  it("resolves each thumbnail url to public URL", async () => {
    mockResolvePublicDownloadUrl
      .mockReturnValueOnce("public-1")
      .mockReturnValueOnce("public-2");

    const result = await withSignedContentThumbnails([
      { id: "c1", thumbnailUrl: "raw-1" },
      { id: "c2", thumbnailUrl: "raw-2" }
    ] as never);

    expect(result).toEqual([
      { id: "c1", thumbnailUrl: "public-1" },
      { id: "c2", thumbnailUrl: "public-2" }
    ]);
  });
});
