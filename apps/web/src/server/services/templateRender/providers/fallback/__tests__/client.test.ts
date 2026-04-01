import { buildFallbackRenderedItem } from "../client";
import { FALLBACK_TEMPLATE_ID } from "../constants";

const captionItem = {
  id: "cap-1",
  hook: "Hook",
  caption: "Caption",
  body: [{ header: "H", content: "C" }]
};

describe("templateRender/providers/fallback buildFallbackRenderedItem", () => {
  it("returns null when no listing images", () => {
    expect(buildFallbackRenderedItem(captionItem, [])).toBeNull();
  });

  it("returns one item with captionItemId, imageUrl, isFallback when images exist", () => {
    const images = [
      {
        url: "https://example.com/img.jpg",
        recommendationScore: null,
        shotType: "room",
        uploadedAt: new Date(1000)
      }
    ];
    const result = buildFallbackRenderedItem(captionItem, images);

    expect(result).not.toBeNull();
    expect(result?.captionItemId).toBe("cap-1");
    expect(result?.imageUrl).toBe("https://example.com/img.jpg");
    expect(result?.isFallback).toBe(true);
    expect(result?.templateId).toBe(FALLBACK_TEMPLATE_ID);
    expect(result?.parametersUsed).toEqual({});
  });

  it("prefers room shots over detail shots", () => {
    const images = [
      {
        url: "https://example.com/second.jpg",
        recommendationScore: 1,
        shotType: "detail",
        uploadedAt: new Date(2000)
      },
      {
        url: "https://example.com/primary.jpg",
        recommendationScore: 0,
        shotType: "room",
        uploadedAt: new Date(1000)
      }
    ];
    const result = buildFallbackRenderedItem(captionItem, images);

    expect(result?.imageUrl).toBe("https://example.com/primary.jpg");
  });

  it("picks by recommendationScore desc when shot type is tied", () => {
    const images = [
      {
        url: "https://example.com/low.jpg",
        recommendationScore: 0.1,
        shotType: "room",
        uploadedAt: new Date(2000)
      },
      {
        url: "https://example.com/high.jpg",
        recommendationScore: 0.9,
        shotType: "room",
        uploadedAt: new Date(1000)
      }
    ];
    const result = buildFallbackRenderedItem(captionItem, images);

    expect(result?.imageUrl).toBe("https://example.com/high.jpg");
  });

  it("picks by uploadedAt desc when shot type and score tie", () => {
    const images = [
      {
        url: "https://example.com/older.jpg",
        recommendationScore: null,
        shotType: "room",
        uploadedAt: new Date(1000)
      },
      {
        url: "https://example.com/newer.jpg",
        recommendationScore: null,
        shotType: "room",
        uploadedAt: new Date(2000)
      }
    ];
    const result = buildFallbackRenderedItem(captionItem, images);

    expect(result?.imageUrl).toBe("https://example.com/newer.jpg");
  });

  it("returns null when first chosen image has no url", () => {
    const images = [
      {
        url: "",
        recommendationScore: null,
        shotType: "room",
        uploadedAt: new Date(1000)
      }
    ];
    expect(buildFallbackRenderedItem(captionItem, images)).toBeNull();
  });
});
