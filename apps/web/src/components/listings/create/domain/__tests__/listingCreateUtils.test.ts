import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import {
  buildFeatureNeedle,
  buildTemplateRenderCaptionItems,
  buildVariedImageSequence,
  filterFeatureClips,
  mapTemplateRenderItemsToPreviewItems,
  rankListingImagesForItem,
  resolveContentMediaType,
  type ListingCreateImage,
  type PreviewClipCandidate
} from "@web/src/components/listings/create/domain/listingCreateUtils";

describe("listingCreateUtils", () => {
  it("builds normalized feature needle from content fields", () => {
    const needle = buildFeatureNeedle({
      id: "item-1",
      hook: "Kitchen + Pantry!",
      caption: "Open-concept living.",
      brollQuery: "Granite countertops",
      body: [{ header: "Deck", content: "Huge yard", broll_query: "firepit" }]
    } as ContentItem);

    expect(needle).toContain("kitchen");
    expect(needle).toContain("open concept");
    expect(needle).toContain("granite countertops");
    expect(needle).toContain("huge yard");
  });

  it("filters feature clips when multiple keyword matches exist", () => {
    const clips: PreviewClipCandidate[] = [
      { id: "1", searchableText: "kitchen island pantry", durationSeconds: 3 },
      { id: "2", searchableText: "bedroom closet", durationSeconds: 3 },
      { id: "3", searchableText: "garage exterior", durationSeconds: 3 }
    ];

    const result = filterFeatureClips(clips, {
      id: "caption-1",
      hook: "Kitchen and bedroom upgrades"
    } as ContentItem);

    expect(result.map((clip) => clip.id)).toEqual(["1", "2"]);
  });

  it("returns a fallback second clip when only one feature clip matches", () => {
    const clips: PreviewClipCandidate[] = [
      { id: "1", searchableText: "kitchen island", durationSeconds: 3 },
      { id: "2", searchableText: "exterior", durationSeconds: 3 }
    ];

    const result = filterFeatureClips(clips, {
      id: "caption-1",
      hook: "Kitchen refresh"
    } as ContentItem);

    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe("1");
    expect(result[1]?.id).toBe("2");
  });

  it("resolves content media type with video default", () => {
    expect(
      resolveContentMediaType({ id: "a", mediaType: "image" } as ContentItem)
    ).toBe("image");
    expect(
      resolveContentMediaType({ id: "b", mediaType: null } as ContentItem)
    ).toBe("video");
  });

  it("ranks listing images by primary, category relevance, score, and recency", () => {
    const images: ListingCreateImage[] = [
      {
        id: "old-primary",
        url: "",
        category: "kitchen",
        isPrimary: true,
        primaryScore: 0.1,
        uploadedAtMs: 10
      },
      {
        id: "new-non-primary",
        url: "",
        category: "kitchen",
        isPrimary: false,
        primaryScore: 0.9,
        uploadedAtMs: 30
      },
      {
        id: "new-primary",
        url: "",
        category: "bedroom",
        isPrimary: true,
        primaryScore: 0.2,
        uploadedAtMs: 20
      }
    ];

    const ranked = rankListingImagesForItem(images, {
      id: "item-1",
      hook: "Bedroom styling"
    } as ContentItem);

    expect(ranked.map((image) => image.id)).toEqual([
      "new-primary",
      "old-primary",
      "new-non-primary"
    ]);
  });

  it("builds deterministic varied image sequence", () => {
    const images: ListingCreateImage[] = [
      {
        id: "a",
        url: "",
        category: null,
        isPrimary: false,
        primaryScore: null,
        uploadedAtMs: 1
      },
      {
        id: "b",
        url: "",
        category: null,
        isPrimary: false,
        primaryScore: null,
        uploadedAtMs: 2
      },
      {
        id: "c",
        url: "",
        category: null,
        isPrimary: false,
        primaryScore: null,
        uploadedAtMs: 3
      }
    ];
    const first = buildVariedImageSequence(images, "seed-1");
    const second = buildVariedImageSequence(images, "seed-1");

    expect(first.map((image) => image.id)).toEqual(
      second.map((image) => image.id)
    );
    expect(new Set(first.map((image) => image.id)).size).toBe(images.length);
  });

  it("keeps single-image array unchanged", () => {
    const image: ListingCreateImage = {
      id: "single",
      url: "",
      category: null,
      isPrimary: false,
      primaryScore: null,
      uploadedAtMs: 1
    };
    const input = [image];
    expect(buildVariedImageSequence(input, "seed")).toBe(input);
  });

  it("sanitizes and filters caption items for template rendering", () => {
    const result = buildTemplateRenderCaptionItems([
      {
        id: "item-1",
        hook: "  Hook  ",
        caption: "  Caption ",
        body: [
          { header: "  Header ", content: "  Content  " },
          { header: "   ", content: "   " }
        ]
      },
      {
        id: "item-2",
        hook: " ",
        caption: " ",
        body: []
      }
    ] as ContentItem[]);

    expect(result).toEqual([
      {
        id: "item-1",
        hook: "Hook",
        caption: "Caption",
        body: [{ header: "Header", content: "Content" }]
      }
    ]);
  });

  it("maps rendered items to preview items with matched caption fallback", () => {
    const mapped = mapTemplateRenderItemsToPreviewItems({
      renderedItems: [
        {
          templateId: "tpl-1",
          captionItemId: "item-1",
          imageUrl: "u1",
          parametersUsed: {}
        }
      ],
      captionItems: [
        { id: "item-1", hook: "My Hook", caption: "My Caption", body: [] }
      ]
    });

    expect(mapped[0]).toMatchObject({
      id: "template-render-tpl-1-item-1-0",
      variationNumber: 1,
      hook: "My Hook",
      caption: "My Caption",
      coverImageUrl: "u1"
    });
    expect(mapped[0]?.slides[0]).toMatchObject({
      id: "tpl-1-render",
      imageUrl: "u1",
      header: "My Hook",
      content: "My Caption"
    });
  });
});
