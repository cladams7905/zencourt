import {
  appendRandomHeaderSuffix,
  overlayPxToCqw,
  parseInlineItalicSegments,
  pickSandwichOverlayArrowPath
} from "..";

describe("textOverlay parsing/arrows/layout", () => {
  it("parses inline italic segments", () => {
    expect(parseInlineItalicSegments("Hello *World* test")).toEqual([
      { text: "Hello ", italic: false },
      { text: "World", italic: true },
      { text: " test", italic: false }
    ]);
  });

  it("appends deterministic header suffixes", () => {
    expect(
      appendRandomHeaderSuffix("Headline", {
        random: () => 0.0,
        emojis: ["X"]
      })
    ).toBe("Headline X");
    expect(
      appendRandomHeaderSuffix("Headline", {
        random: () => 0.4,
        arrowSymbol: ">"
      })
    ).toBe("Headline >");
    expect(appendRandomHeaderSuffix("Headline", { random: () => 0.9 })).toBe(
      "Headline"
    );
  });

  it("selects sandwich arrows only for sandwich templates", () => {
    expect(
      pickSandwichOverlayArrowPath({
        text: "A",
        lines: [],
        background: "black",
        font: "serif-classic",
        position: "center",
        templatePattern: "simple"
      })
    ).toBeNull();

    const picked = pickSandwichOverlayArrowPath({
      text: "A",
      lines: [{ text: "A", fontRole: "headline" }],
      background: "black",
      font: "serif-classic",
      position: "center",
      templatePattern: "sandwich"
    });

    if (picked !== null) {
      expect(picked).toContain("/overlays/arrows/");
    }
  });

  it("converts overlay pixels to cqw", () => {
    expect(overlayPxToCqw(108)).toBe("10.000cqw");
  });
});
