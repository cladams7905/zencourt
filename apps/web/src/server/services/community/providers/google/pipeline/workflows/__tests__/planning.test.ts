const mockCountListItems = jest.fn();
const mockGetCachedCommunityCategoryList = jest.fn();

jest.mock("@web/src/server/services/community/providers/google/core/places", () => ({
  countListItems: (...args: unknown[]) => mockCountListItems(...args)
}));

jest.mock("@web/src/server/services/community/providers/google/core/seasonal", () => ({
  NON_NEIGHBORHOOD_CATEGORY_KEYS: ["dining", "education"]
}));

jest.mock("@web/src/server/services/community/config", () => ({
  NEIGHBORHOOD_QUERIES: [
    { key: "neighborhoods_general", query: "q1", max: 3 },
    { key: "neighborhoods_family", query: "q2", max: 3 }
  ]
}));

jest.mock("@web/src/server/services/community/providers/google/pipeline/shared", () => ({
  communityCache: {
    getCachedCommunityCategoryList: (...args: unknown[]) =>
      mockGetCachedCommunityCategoryList(...args)
  }
}));

import { loadBaseCachePlan } from "@web/src/server/services/community/providers/google/pipeline/workflows/planning";

describe("google planning workflow", () => {
  beforeEach(() => {
    mockCountListItems.mockReset();
    mockGetCachedCommunityCategoryList.mockReset();
    mockCountListItems.mockImplementation((value: string) => (value ? 1 : 0));
  });

  it("splits category and neighborhood cache hits from misses", async () => {
    mockGetCachedCommunityCategoryList
      .mockResolvedValueOnce("- Dining")
      .mockResolvedValueOnce("- General")
      .mockResolvedValueOnce(null);

    const result = await loadBaseCachePlan({
      zipCode: "78701",
      skipCategories: new Set(["education"] as never)
    });

    expect(result.cachedCategoryLists.get("dining" as never)).toBe("- Dining");
    expect(result.categoriesToFetch.size).toBe(0);
    expect(result.cachedNeighborhoodLists.get("neighborhoods_general")).toBe("- General");
    expect(result.neighborhoodsToFetch).toEqual([
      { key: "neighborhoods_family", query: "q2", max: 3 }
    ]);
  });
});
