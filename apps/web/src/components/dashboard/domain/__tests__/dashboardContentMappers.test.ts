import {
  mapDoneItemsToContentItems,
  mapStreamItemsToContentItems,
  removeStreamItems,
  replaceStreamItemsWithDoneItems,
  toggleFavoriteAcrossGenerated
} from "@web/src/components/dashboard/domain/dashboardContentMappers";
import { cloneDefaultGeneratedState } from "@web/src/components/dashboard/domain/dashboardSessionUtils";

describe("dashboardContentMappers", () => {
  it("maps streamed and done items with expected ids", () => {
    const input = [{ hook: "H1", caption: "C1" }];

    const streamed = mapStreamItemsToContentItems(input);
    const done = mapDoneItemsToContentItems(input);

    expect(streamed[0]?.id.startsWith("stream-")).toBe(true);
    expect(done[0]?.id.startsWith("generated-")).toBe(true);
    expect(streamed[0]?.hook).toBe("H1");
  });

  it("replaces stream items with done items", () => {
    const current = [
      { id: "stream-1", hook: "temp" },
      { id: "generated-1", hook: "existing" }
    ];
    const done = [{ id: "generated-2", hook: "final" }];

    expect(replaceStreamItemsWithDoneItems(current, done)).toEqual([
      { id: "generated-1", hook: "existing" },
      { id: "generated-2", hook: "final" }
    ]);
    expect(removeStreamItems(current)).toEqual([{ id: "generated-1", hook: "existing" }]);
  });

  it("toggles favorite across generated state", () => {
    const state = cloneDefaultGeneratedState();
    state.videos.market_insights = [
      { id: "item-1", hook: "A", isFavorite: false },
      { id: "item-2", hook: "B", isFavorite: false }
    ];

    const next = toggleFavoriteAcrossGenerated(state, "item-2");

    expect(next.videos.market_insights[1]?.isFavorite).toBe(true);
    expect(next.videos.market_insights[0]?.isFavorite).toBe(false);
  });
});
