import { withSignedContentThumbnails } from "@web/src/server/models/listings/helpers";

describe("listings helpers", () => {
  it("returns early for empty lists", async () => {
    await expect(withSignedContentThumbnails([])).resolves.toEqual([]);
  });

  it("returns content list unchanged", async () => {
    const result = await withSignedContentThumbnails([
      { id: "c1", thumbnailUrl: "raw-1" },
      { id: "c2", thumbnailUrl: "raw-2" }
    ] as never);

    expect(result).toEqual([
      { id: "c1", thumbnailUrl: "raw-1" },
      { id: "c2", thumbnailUrl: "raw-2" }
    ]);
  });
});
