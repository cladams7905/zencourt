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

    renderHook(() =>
      useListingCreateEffects({
        listingId: "l1",
        pathname: "/listings/l1/create",
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

    return { generateSubcategoryContent };
  }

  it("syncs URL params and emits sidebar update", () => {
    renderEffects();

    expect(mockEmitListingSidebarUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ id: "l1", listingStage: "create" })
    );
    expect(window.location.search).toBe("?mediaType=photos&filter=new_listing");
  });

  it("uses history.replaceState when URL has no params to avoid redundant server round-trip", () => {
    window.history.replaceState({}, "", "/listings/l1/create");

    renderHook(() =>
      useListingCreateEffects({
        listingId: "l1",
        pathname: "/listings/l1/create",
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

  it("avoids duplicate replaceState calls for the same URL across rerenders", () => {
    const replaceSpy = jest.spyOn(window.history, "replaceState");
    const { rerender } = renderHook(
      () =>
        useListingCreateEffects({
          listingId: "l1",
          pathname: "/listings/l1/create",
          activeMediaTab: "images",
          activeSubcategory: "status_update",
          initialMediaTab: "images",
          initialSubcategory: "new_listing",
          activeMediaItemsLength: 1,
          isGenerating: false,
          generationError: null,
          templateRenderError: null,
          generateSubcategoryContent: jest.fn().mockResolvedValue(undefined)
        }),
    );

    rerender();

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    replaceSpy.mockRestore();
  });
});
