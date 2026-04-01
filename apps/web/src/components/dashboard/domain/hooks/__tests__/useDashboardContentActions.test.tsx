import { act, renderHook } from "@testing-library/react";
import { toggleFavoriteAcrossGenerated } from "@web/src/components/dashboard/domain/dashboardContentMappers";
import { useDashboardContentActions } from "../useDashboardContentActions";

jest.mock(
  "@web/src/components/dashboard/domain/dashboardContentMappers",
  () => ({
    toggleFavoriteAcrossGenerated: jest.fn()
  })
);

const mockToggleFavoriteAcrossGenerated = jest.mocked(toggleFavoriteAcrossGenerated);

describe("useDashboardContentActions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates favorite toggles through the generated-content updater", () => {
    const setGeneratedContentItems = jest.fn();
    const nextState = { posts: { market_insights: [{ id: "item-1" }] } };
    mockToggleFavoriteAcrossGenerated.mockReturnValue(nextState as never);

    const { result } = renderHook(() =>
      useDashboardContentActions({
        contentType: "posts" as never,
        activeCategory: "market_insights" as never,
        setGeneratedContentItems
      })
    );

    act(() => {
      result.current.handleFavoriteToggle("item-1");
    });

    const updater = setGeneratedContentItems.mock.calls[0]?.[0] as (
      prev: unknown
    ) => unknown;
    const previousState = { posts: { market_insights: [{ id: "item-1" }] } };

    expect(updater(previousState)).toBe(nextState);
    expect(mockToggleFavoriteAcrossGenerated).toHaveBeenCalledWith(
      previousState,
      "item-1"
    );
  });

  it("does not delete items when there is no active category", () => {
    const setGeneratedContentItems = jest.fn();

    const { result } = renderHook(() =>
      useDashboardContentActions({
        contentType: "posts" as never,
        activeCategory: null,
        setGeneratedContentItems
      })
    );

    act(() => {
      result.current.handleDeleteGeneratedItem("item-1");
    });

    expect(setGeneratedContentItems).not.toHaveBeenCalled();
  });

  it("removes a generated item from the active category only", () => {
    const setGeneratedContentItems = jest.fn();

    const { result } = renderHook(() =>
      useDashboardContentActions({
        contentType: "posts" as never,
        activeCategory: "market_insights" as never,
        setGeneratedContentItems
      })
    );

    act(() => {
      result.current.handleDeleteGeneratedItem("item-2");
    });

    const updater = setGeneratedContentItems.mock.calls[0]?.[0] as (
      prev: Record<string, unknown>
    ) => Record<string, unknown>;
    const previousState = {
      posts: {
        market_insights: [{ id: "item-1" }, { id: "item-2" }],
        lifestyle: [{ id: "item-3" }]
      }
    };

    expect(updater(previousState)).toEqual({
      posts: {
        market_insights: [{ id: "item-1" }],
        lifestyle: [{ id: "item-3" }]
      }
    });
  });
});
