import {
  countListItems,
  dedupePlaces,
  formatPlaceList,
  rankPlaces,
  sampleFromPool,
  sampleRandom,
  trimList,
  type ScoredPlace
} from "@web/src/server/services/community/providers/google/core/places";

describe("google core places", () => {
  it("sampleRandom returns full copy when count exceeds input", () => {
    expect(sampleRandom([1, 2], 5)).toEqual([1, 2]);
  });

  it("sampleFromPool returns bounded randomized items", () => {
    const spy = jest.spyOn(Math, "random").mockReturnValue(0.25);
    const result = sampleFromPool([1, 2, 3, 4, 5, 6], 3);
    expect(result).toHaveLength(3);
    spy.mockRestore();
  });

  it("sampleFromPool returns shuffled copy when pool is smaller than count", () => {
    const spy = jest.spyOn(Math, "random").mockReturnValue(0.5);
    expect(sampleFromPool([1, 2], 5)).toHaveLength(2);
    spy.mockRestore();
  });

  it("ranks by weighted quality score", () => {
    const places: ScoredPlace[] = [
      { name: "A", rating: 4.8, reviewCount: 200, address: "", category: "dining", distanceKm: 10 },
      { name: "B", rating: 4.2, reviewCount: 20, address: "", category: "dining", distanceKm: 1 }
    ];
    const ranked = rankPlaces(places);
    expect(ranked[0].name).toBe("A");
  });

  it("dedupes by placeId and merges metadata", () => {
    const places: ScoredPlace[] = [
      {
        name: "Cafe",
        rating: 4,
        reviewCount: 10,
        address: "x",
        category: "coffee",
        placeId: "p1",
        sourceQueries: ["q1"]
      },
      {
        name: "Cafe",
        rating: 4.5,
        reviewCount: 50,
        address: "x",
        category: "coffee",
        placeId: "p1",
        keywords: ["espresso"],
        sourceQueries: ["q2"]
      }
    ];

    const deduped = dedupePlaces(places);
    expect(deduped).toHaveLength(1);
    expect(deduped[0].reviewCount).toBe(50);
    expect(deduped[0].keywords).toEqual(["espresso"]);
    expect(deduped[0].sourceQueries).toEqual(expect.arrayContaining(["q1", "q2"]));
  });

  it("dedupes without placeId using normalized key", () => {
    const deduped = dedupePlaces([
      { name: "Cafe!", rating: 4, reviewCount: 10, address: "A", category: "coffee" },
      { name: "Cafe", rating: 4.1, reviewCount: 20, address: "A", category: "coffee" }
    ]);
    expect(deduped).toHaveLength(1);
  });

  it("formats and trims list content", () => {
    const places: ScoredPlace[] = [
      { name: "P1", rating: 4, reviewCount: 40, address: "", category: "dining", keywords: ["k1"] },
      { name: "P2", rating: 3.9, reviewCount: 30, address: "", category: "dining" }
    ];

    const formatted = formatPlaceList(places, 2, true);
    expect(formatted).toContain("- P1");

    expect(trimList("- A — k1\n- B — k2", 1, true)).toBe("- A");
    expect(trimList("", 2, false)).toBe("- (none found)");
    expect(trimList("- (none found)", 2, true)).toBe("- (none found)");
    expect(trimList("- A — k1\n- B — k2", 2, false)).toBe("- A — k1\n- B — k2");
    expect(countListItems("- A\n- (none found)\n- B")).toBe(2);
  });

  it("formatPlaceList returns none-found for empty input", () => {
    expect(formatPlaceList([], 3, true)).toBe("- (none found)");
  });
});
