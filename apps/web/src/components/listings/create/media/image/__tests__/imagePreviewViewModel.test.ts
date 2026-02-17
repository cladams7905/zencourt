import {
  buildImagePreviewOverlay,
  resolveItemTemplatePattern
} from "@web/src/components/listings/create/media/image/imagePreviewViewModel";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";

jest.mock(
  "@shared/utils",
  () => ({
    pickPreviewTextOverlayVariant: () => ({
      position: "center",
      background: "black",
      font: "serif-classic",
      fontPairing: "classic-clean"
    }),
    pickRichOverlayFontPairing: () => "classic-clean",
    pickRichOverlayFontPairingForVariation: () => "modern-script",
    pickRichOverlayPosition: () => "top-third",
    buildOverlayTemplateLines: (
      textOverlay: { headline?: string | null; accent_top?: string | null; accent_bottom?: string | null } | null | undefined,
      plainText: string,
      patternOverride?: "sandwich" | "accent-headline"
    ) => ({
      pattern:
        patternOverride ??
        (textOverlay?.accent_top && textOverlay?.accent_bottom
          ? "sandwich"
          : "simple"),
      lines: [{ text: textOverlay?.headline ?? plainText, fontRole: "body" }]
    })
  }),
  { virtual: true }
);

describe("imagePreviewViewModel", () => {
  it("resolves sandwich when no slides", () => {
    const item = { id: "i1", slides: [] } as ListingImagePreviewItem;
    expect(resolveItemTemplatePattern(item)).toBe("sandwich");
  });

  it("resolves sandwich when a slide has both accents", () => {
    const item = {
      id: "i1",
      slides: [
        {
          id: "s1",
          imageUrl: null,
          header: "Header",
          content: "",
          textOverlay: { headline: "Headline", accent_top: "Top", accent_bottom: "Bottom" }
        }
      ]
    } as ListingImagePreviewItem;
    expect(resolveItemTemplatePattern(item)).toBe("sandwich");
  });

  it("resolves accent-headline without both accents", () => {
    const item = {
      id: "i1",
      slides: [{ id: "s1", imageUrl: null, header: "Header", content: "" }]
    } as ListingImagePreviewItem;
    expect(resolveItemTemplatePattern(item)).toBe("accent-headline");
  });

  it("returns null overlay when slide has no text", () => {
    expect(
      buildImagePreviewOverlay(
        "item-1",
        { id: "s1", imageUrl: null, header: "  ", content: "", textOverlay: null },
        1
      )
    ).toBeNull();
  });

  it("builds rich overlay and uses variation pairing when subheaders exist", () => {
    const overlay = buildImagePreviewOverlay(
      "item-1",
      {
        id: "s1",
        imageUrl: null,
        header: "Headline",
        content: "",
        textOverlay: { headline: "Headline", accent_top: "Top", accent_bottom: "Bottom" }
      },
      2,
      "sandwich"
    );

    expect(overlay).toMatchObject({
      templatePattern: "sandwich",
      position: "top-third",
      background: "none",
      fontPairing: "modern-script"
    });
  });

  it("builds simple overlay when template resolves simple", () => {
    const overlay = buildImagePreviewOverlay(
      "item-1",
      {
        id: "s1",
        imageUrl: null,
        header: "Simple text",
        content: "",
        textOverlay: null
      },
      1
    );

    expect(overlay).toMatchObject({
      templatePattern: "simple",
      position: "center",
      background: "black",
      fontPairing: "classic-clean"
    });
  });
});
