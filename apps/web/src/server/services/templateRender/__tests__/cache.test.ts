import {
  buildTemplateRenderCacheKey,
  TEMPLATE_RENDER_CACHE_PREFIX
} from "../cache";

jest.mock("@web/src/lib/cache/redisClient", () => ({
  getSharedRedisClient: jest.fn().mockReturnValue(null)
}));

describe("templateRender/cache", () => {
  describe("buildTemplateRenderCacheKey", () => {
    it("returns same key for same params", () => {
      const params = {
        listingId: "L1",
        subcategory: "new_listing" as const,
        captionItemId: "cap-1",
        templateId: "tpl-1",
        modifications: { headerText: "Hello", backgroundImage1: "https://a.com/1.png" }
      };
      expect(buildTemplateRenderCacheKey(params)).toBe(
        buildTemplateRenderCacheKey(params)
      );
    });

    it("returns different key for different modifications", () => {
      const base = {
        listingId: "L1",
        subcategory: "new_listing" as const,
        captionItemId: "cap-1",
        templateId: "tpl-1",
        modifications: { headerText: "Hello" }
      };
      const key1 = buildTemplateRenderCacheKey(base);
      const key2 = buildTemplateRenderCacheKey({
        ...base,
        modifications: { headerText: "World" }
      });
      expect(key1).not.toBe(key2);
    });

    it("includes prefix and listing/caption/template ids", () => {
      const key = buildTemplateRenderCacheKey({
        listingId: "listing-1",
        subcategory: "open_house",
        captionItemId: "cap-1",
        templateId: "4000",
        modifications: {}
      });
      expect(key.startsWith(TEMPLATE_RENDER_CACHE_PREFIX)).toBe(true);
      expect(key).toContain("listing-1");
      expect(key).toContain("open_house");
      expect(key).toContain("cap-1");
      expect(key).toContain("4000");
    });
  });
});
