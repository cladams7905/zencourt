import {
  signUrlArray,
  mapWithSignedUrl
} from "@web/src/server/models/shared/urlSigning";

describe("urlSigning", () => {
  describe("signUrlArray", () => {
    it("returns only successfully signed URLs", async () => {
      const signer = jest.fn();
      signer.mockResolvedValueOnce("https://signed-a");
      signer.mockResolvedValueOnce(null);
      signer.mockResolvedValueOnce("https://signed-c");

      const result = await signUrlArray(
        ["https://a", "https://b", "https://c"],
        signer
      );

      expect(result).toEqual(["https://signed-a", "https://signed-c"]);
      expect(signer).toHaveBeenCalledTimes(3);
    });

    it("returns empty array when all signers return null/undefined", async () => {
      const signer = jest.fn().mockResolvedValue(null);
      const result = await signUrlArray(["https://a", "https://b"], signer);
      expect(result).toEqual([]);
    });

    it("returns all URLs when signer returns each", async () => {
      const signer = (url: string) => Promise.resolve(`${url}?signed=1`);
      const result = await signUrlArray(
        ["https://a", "https://b"],
        signer
      );
      expect(result).toEqual(["https://a?signed=1", "https://b?signed=1"]);
    });
  });

  describe("mapWithSignedUrl", () => {
    it("replaces url with signed url when fallbackToOriginal is true", async () => {
      const signer = jest.fn((url: string) =>
        Promise.resolve(`${url}?signed=1`)
      );
      const rows = [{ url: "https://a", id: "1" }, { url: "https://b", id: "2" }];
      const result = await mapWithSignedUrl(rows, signer, {
        fallbackToOriginal: true
      });

      expect(result).toEqual([
        { url: "https://a?signed=1", id: "1" },
        { url: "https://b?signed=1", id: "2" }
      ]);
    });

    it("falls back to original url when signer returns null and fallbackToOriginal is true", async () => {
      const signer = jest.fn().mockResolvedValue(null);
      const rows = [{ url: "https://original" }];
      const result = await mapWithSignedUrl(rows, signer, {
        fallbackToOriginal: true
      });

      expect(result).toEqual([{ url: "https://original" }]);
    });

    it("filters out row when signer returns null and fallbackToOriginal is false", async () => {
      const signer = jest.fn().mockResolvedValue(null);
      const rows = [{ url: "https://original" }];
      const result = await mapWithSignedUrl(rows, signer, {
        fallbackToOriginal: false
      });

      expect(result).toEqual([]);
    });

    it("filters out rows with empty url when fallbackToOriginal is false", async () => {
      const signer = jest.fn((url: string) =>
        url === "https://a" ? Promise.resolve("https://signed-a") : Promise.resolve(null)
      );
      const rows = [
        { url: "https://a", id: "1" },
        { url: "https://b", id: "2" }
      ];
      const result = await mapWithSignedUrl(rows, signer, {
        fallbackToOriginal: false
      });

      expect(result).toEqual([{ url: "https://signed-a", id: "1" }]);
    });

    it("defaults fallbackToOriginal to true", async () => {
      const signer = jest.fn().mockResolvedValue(null);
      const rows = [{ url: "https://x" }];
      const result = await mapWithSignedUrl(rows, signer);
      expect(result).toEqual([{ url: "https://x" }]);
    });
  });
});
