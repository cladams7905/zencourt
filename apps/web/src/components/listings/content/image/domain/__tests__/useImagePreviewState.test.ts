import { act, renderHook } from "@testing-library/react";
import { useImagePreviewState } from "../useImagePreviewState";

const items = [
  {
    id: "item-1",
    variationNumber: 1,
    hook: "Hook 1",
    caption: "Caption 1",
    slides: [],
    coverImageUrl: null
  },
  {
    id: "item-2",
    variationNumber: 2,
    hook: "Hook 2",
    caption: "Caption 2",
    slides: [],
    coverImageUrl: null
  }
];

describe("useImagePreviewState", () => {
  it("starts with no selection and no per-card slide state", () => {
    const { result } = renderHook(() => useImagePreviewState(items as never));

    expect(result.current.selectedItem).toBeNull();
    expect(result.current.selectedItemId).toBeNull();
    expect(result.current.activeSlideIndex).toBe(0);
    expect(result.current.cardSlideIndexById).toEqual({});
  });

  it("derives the selected item from the selected item id", () => {
    const { result } = renderHook(() => useImagePreviewState(items as never));

    act(() => {
      result.current.setSelectedItemId("item-2");
    });

    expect(result.current.selectedItem?.id).toBe("item-2");
  });

  it("resets the active slide index when the selected item changes", () => {
    const { result } = renderHook(() => useImagePreviewState(items as never));

    act(() => {
      result.current.setActiveSlideIndex(3);
    });

    expect(result.current.activeSlideIndex).toBe(3);

    act(() => {
      result.current.setSelectedItemId("item-1");
    });

    expect(result.current.activeSlideIndex).toBe(0);

    act(() => {
      result.current.setActiveSlideIndex(2);
      result.current.setSelectedItemId("item-2");
    });

    expect(result.current.activeSlideIndex).toBe(0);
    expect(result.current.selectedItem?.id).toBe("item-2");
  });

  it("updates the selected item when the backing items change", () => {
    const { result, rerender } = renderHook(
      ({ nextItems }) => useImagePreviewState(nextItems as never),
      { initialProps: { nextItems: items } }
    );

    act(() => {
      result.current.setSelectedItemId("item-1");
    });

    rerender({
      nextItems: [{ ...items[0], hook: "Updated hook" }, items[1]]
    });

    expect(result.current.selectedItem?.hook).toBe("Updated hook");
  });
});
