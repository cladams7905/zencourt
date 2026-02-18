import {
  mapWithSignedUrl,
  signUrlArray
} from "@web/src/server/actions/shared/urlSigning";

describe("urlSigning", () => {
  it("filters null signed URLs", async () => {
    const result = await signUrlArray(["a", "b"], async (url) =>
      url === "a" ? "sa" : null
    );
    expect(result).toEqual(["sa"]);
  });

  it("maps rows with signed URL and falls back", async () => {
    const rows = [{ id: "1", url: "a" }, { id: "2", url: "b" }];
    const result = await mapWithSignedUrl(rows, async (url) =>
      url === "a" ? "sa" : null
    );
    expect(result).toEqual([{ id: "1", url: "sa" }, { id: "2", url: "b" }]);
  });

  it("drops rows when fallback disabled and signing fails", async () => {
    const rows = [{ id: "1", url: "a" }, { id: "2", url: "b" }];
    const result = await mapWithSignedUrl(
      rows,
      async (url) => (url === "a" ? "sa" : null),
      { fallbackToOriginal: false }
    );
    expect(result).toEqual([{ id: "1", url: "sa" }]);
  });
});
