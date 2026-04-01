import {
  buildTemplateRenderCaptionItems,
  getCachedPreviewsFromCaptionItems,
  mapCachedRenderedPreviewToPreviewItem,
  mapSingleTemplateRenderItemToPreviewItem,
  mapTemplateRenderItemsToPreviewItems
} from "../utils";

describe("templateRenderUtils", () => {
  it("builds sanitized caption items and preserves cache keys only when both values exist", () => {
    expect(
      buildTemplateRenderCaptionItems([
        {
          id: "item-1",
          hook: "  Hook  ",
          caption: "  Caption  ",
          brollQuery: "  kitchen  ",
          body: [
            { header: "  Header  ", content: "  Content  " },
            { header: "   ", content: "   " }
          ],
          cacheKeyTimestamp: 123,
          cacheKeyId: 456
        },
        {
          id: "item-2",
          hook: "   ",
          caption: null,
          body: []
        },
        {
          id: "item-3",
          hook: null,
          caption: "Has caption",
          body: [],
          cacheKeyTimestamp: 123
        }
      ] as never)
    ).toEqual([
      {
        id: "item-1",
        hook: "Hook",
        caption: "Caption",
        broll_query: "kitchen",
        cta: null,
        body: [{ header: "Header", content: "Content" }],
        cacheKeyTimestamp: 123,
        cacheKeyId: 456
      },
      {
        id: "item-3",
        hook: null,
        caption: "Has caption",
        broll_query: null,
        cta: null,
        body: []
      }
    ]);
  });

  it("maps rendered items to preview items with caption fallbacks", () => {
    expect(
      mapTemplateRenderItemsToPreviewItems({
        renderedItems: [
          {
            templateId: "template-1",
            imageUrl: "https://img/1.jpg",
            captionItemId: "item-1",
            isFallback: false
          },
          {
            templateId: "template-2",
            imageUrl: "https://img/2.jpg",
            captionItemId: "missing",
            isFallback: true
          }
        ] as never,
        captionItems: [
          {
            id: "item-1",
            hook: "Hook",
            caption: "Caption",
            body: []
          }
        ] as never
      })
    ).toEqual([
      {
        id: "template-render-template-1-item-1-0",
        variationNumber: 1,
        hook: "Hook",
        caption: "Caption",
        slides: [
          {
            id: "template-1-render",
            imageUrl: "https://img/1.jpg",
            header: "Hook",
            content: "Caption",
            textOverlay: null
          }
        ],
        coverImageUrl: "https://img/1.jpg",
        isTemplateRender: true,
        captionItemId: "item-1"
      },
      {
        id: "template-render-template-2-missing-1",
        variationNumber: 2,
        hook: null,
        caption: null,
        slides: [
          {
            id: "template-2-render",
            imageUrl: "https://img/2.jpg",
            header: "Listing",
            content: "",
            textOverlay: null
          }
        ],
        coverImageUrl: "https://img/2.jpg",
        isTemplateRender: false,
        captionItemId: "missing"
      }
    ]);
  });

  it("maps cached rendered previews into preview items and filters caption items without a cache", () => {
    const cachedItem = {
      id: "item-1",
      hook: " Hook ",
      caption: " Caption ",
      cachedRenderedPreview: {
        imageUrl: "https://img/cached.jpg",
        templateId: "template-9",
        modifications: {}
      }
    };

    expect(mapCachedRenderedPreviewToPreviewItem(cachedItem as never, 7)).toEqual(
      {
        id: "cached-preview-item-1-template-9",
        variationNumber: 7,
        hook: " Hook ",
        caption: " Caption ",
        slides: [
          {
            id: "template-9-cached",
            imageUrl: "https://img/cached.jpg",
            header: "Hook",
            content: "Caption",
            textOverlay: null
          }
        ],
        coverImageUrl: "https://img/cached.jpg",
        isTemplateRender: true,
        captionItemId: "item-1"
      }
    );

    expect(
      getCachedPreviewsFromCaptionItems([
        cachedItem,
        { id: "item-2", hook: "No cache" }
      ] as never)
    ).toHaveLength(1);
  });

  it("maps a single rendered item and overrides its variation number", () => {
    expect(
      mapSingleTemplateRenderItemToPreviewItem({
        renderedItem: {
          templateId: "template-1",
          imageUrl: "https://img/1.jpg",
          captionItemId: "item-1",
          isFallback: false
        } as never,
        captionItems: [
          {
            id: "item-1",
            hook: "Hook",
            caption: "Caption",
            body: []
          }
        ] as never,
        variationNumber: 9
      })
    ).toMatchObject({
      id: "template-render-template-1-item-1-0",
      variationNumber: 9,
      captionItemId: "item-1"
    });
  });
});
