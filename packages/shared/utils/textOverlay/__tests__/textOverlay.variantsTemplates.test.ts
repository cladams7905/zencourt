import {
  buildOverlayTemplateLines,
  getOverlayTemplate,
  hashTextOverlaySeed,
  pickPreviewTextOverlayVariant,
  pickRichOverlayFontPairingForVariation,
  pickRichOverlayPosition,
  resolveOverlayTemplatePattern
} from "..";

describe("textOverlay variants/templates", () => {
  it("produces stable hash and deterministic variant picks", () => {
    const seed = "listing-123";
    const hashA = hashTextOverlaySeed(seed);
    const hashB = hashTextOverlaySeed(seed);
    const variantA = pickPreviewTextOverlayVariant(seed);
    const variantB = pickPreviewTextOverlayVariant(seed);

    expect(hashA).toBe(hashB);
    expect(variantA).toEqual(variantB);
  });

  it("resolves template pattern from accent fields", () => {
    expect(resolveOverlayTemplatePattern({ headline: "A" })).toBe("simple");
    expect(
      resolveOverlayTemplatePattern({ headline: "A", accent_top: "Top" })
    ).toBe("accent-headline");
    expect(
      resolveOverlayTemplatePattern({
        headline: "A",
        accent_top: "Top",
        accent_bottom: "Bottom"
      })
    ).toBe("sandwich");
  });

  it("builds fallback lines when template input lines are empty", () => {
    const built = buildOverlayTemplateLines(
      { headline: "   ", accent_top: " " },
      "Fallback"
    );

    expect(built.pattern).toBe("simple");
    expect(built.lines).toEqual([{ text: "Fallback", fontRole: "body" }]);
  });

  it("returns known template definitions", () => {
    const sandwich = getOverlayTemplate("sandwich");
    expect(sandwich.pattern).toBe("sandwich");
    expect(sandwich.lines).toHaveLength(3);
  });

  it("maps variation numbers deterministically", () => {
    expect(pickRichOverlayFontPairingForVariation(1)).toBe(
      "block-rouge-italiana"
    );
    expect(pickRichOverlayFontPairingForVariation(6)).toBe(
      "block-rouge-italiana"
    );
    expect(["top-third", "center", "bottom-third"]).toContain(
      pickRichOverlayPosition("seed")
    );
  });
});
