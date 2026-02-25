import { renderHook } from "@testing-library/react";

const mockToastError = jest.fn();
const mockEmitListingSidebarUpdate = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("@web/src/lib/domain/listing/sidebarEvents", () => ({
  emitListingSidebarUpdate: (...args: unknown[]) =>
    mockEmitListingSidebarUpdate(...args)
}));

import { useListingCreateEffects } from "@web/src/components/listings/create/domain/useListingCreateEffects";

describe("useListingCreateEffects", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.history.replaceState({}, "", "/listings/l1/create?mediaType=videos&filter=new_listing");
  });

  function renderEffects(overrides?: Record<string, unknown>) {
    const generateSubcategoryContent = jest.fn().mockResolvedValue(undefined);
    const replaceUrl = jest.fn();

    renderHook(() =>
      useListingCreateEffects({
        listingId: "l1",
        pathname: "/listings/l1/create",
        replaceUrl,
        activeMediaTab: "images",
        activeSubcategory: "new_listing",
        initialMediaTab: "images",
        initialSubcategory: "new_listing",
        activeMediaItemsLength: 0,
        isGenerating: false,
        generationError: null,
        templateRenderError: null,
        generateSubcategoryContent,
        ...overrides
      } as never)
    );

    return { generateSubcategoryContent, replaceUrl };
  }

  it("syncs URL params and emits sidebar update", () => {
    const { replaceUrl } = renderEffects();

    expect(mockEmitListingSidebarUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "l1", listingStage: "create" })
    );
    expect(replaceUrl).toHaveBeenCalledWith(
      "/listings/l1/create?mediaType=photos&filter=new_listing"
    );
  });

  it("uses history.replaceState when URL has no params to avoid redundant server round-trip", () => {
    window.history.replaceState({}, "", "/listings/l1/create");
    const replaceUrl = jest.fn();

    renderHook(() =>
      useListingCreateEffects({
        listingId: "l1",
        pathname: "/listings/l1/create",
        replaceUrl,
        activeMediaTab: "videos",
        activeSubcategory: "new_listing",
        initialMediaTab: "videos",
        initialSubcategory: "new_listing",
        activeMediaItemsLength: 0,
        isGenerating: false,
        generationError: null,
        templateRenderError: null,
        generateSubcategoryContent: jest.fn().mockResolvedValue(undefined)
      } as never)
    );

    expect(replaceUrl).not.toHaveBeenCalled();
    expect(window.location.search).toBe("?mediaType=videos&filter=new_listing");
  });

  it("triggers initial auto-generation when no active items", () => {
    const { generateSubcategoryContent } = renderEffects();
    expect(generateSubcategoryContent).toHaveBeenCalledWith("new_listing");
  });

  it("dedupes repeated error toasts", () => {
    const { rerender } = renderHook(
      ({ generationError }) =>
        useListingCreateEffects({
          listingId: "l1",
          pathname: "/listings/l1/create",
          replaceUrl: jest.fn(),
          activeMediaTab: "images",
          activeSubcategory: "new_listing",
          initialMediaTab: "images",
          initialSubcategory: "new_listing",
          activeMediaItemsLength: 1,
          isGenerating: false,
          generationError,
          templateRenderError: null,
          generateSubcategoryContent: jest.fn().mockResolvedValue(undefined)
        }),
      { initialProps: { generationError: "bad" } }
    );

    rerender({ generationError: "bad" });
    expect(mockToastError).toHaveBeenCalledTimes(1);
  });
});
