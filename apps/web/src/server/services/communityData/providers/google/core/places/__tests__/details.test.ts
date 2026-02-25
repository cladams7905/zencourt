const mockDedupePlaces = jest.fn();
const mockRankPlaces = jest.fn();
const mockFormatPlaceList = jest.fn();

jest.mock("../index", () => ({
  dedupePlaces: (...args: unknown[]) => mockDedupePlaces(...args),
  rankPlaces: (...args: unknown[]) => mockRankPlaces(...args),
  formatPlaceList: (...args: unknown[]) => mockFormatPlaceList(...args)
}));

import {
  deriveSummaryKeywords,
  buildCategoryListWithDetails,
  hydratePlacesFromItems
} from "../details";

describe("google places details", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prefers generative summary over keywords", () => {
    const result = deriveSummaryKeywords({
      generativeSummary: { overview: { text: " Great spot " } }
    } as never);

    expect(result).toEqual({ summary: "Great spot" });
  });

  it("derives keywords from primary/types and filters generic ones", () => {
    const result = deriveSummaryKeywords({
      primaryType: "restaurant",
      types: ["point_of_interest", "food", "mexican_restaurant", "bar"]
    } as never);

    expect(result).toEqual({ keywords: ["restaurant", "mexican restaurant", "bar"] });
  });

  it("hydrates category list with place details before formatting", async () => {
    const places = [{ placeId: "p1", name: "", address: "", category: "dining" }];
    mockDedupePlaces.mockReturnValue(places);
    mockRankPlaces.mockReturnValue(places);
    mockFormatPlaceList.mockReturnValue("formatted");

    const getPlaceDetails = jest.fn().mockResolvedValue({
      displayName: { text: "Cafe" },
      formattedAddress: "123 Main",
      rating: 4.7,
      userRatingCount: 100,
      primaryType: "coffee_shop",
      types: []
    });

    const result = await buildCategoryListWithDetails(
      "dining",
      places as never,
      3,
      getPlaceDetails
    );

    expect(result).toBe("formatted");
    expect(getPlaceDetails).toHaveBeenCalledWith("p1");
    expect(mockFormatPlaceList).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Cafe",
          address: "123 Main",
          rating: 4.7,
          reviewCount: 100,
          keywords: ["coffee shop"]
        })
      ]),
      3,
      true
    );
  });

  it("hydrates places from cached items and drops invalid entries", async () => {
    const getPlaceDetails = jest
      .fn()
      .mockResolvedValueOnce({
        displayName: { text: "Park" },
        rating: 4.2,
        userRatingCount: 10,
        formattedAddress: "Park St",
        primaryType: "park",
        types: []
      })
      .mockResolvedValueOnce(null);

    const result = await hydratePlacesFromItems(
      [
        { placeId: "p1", sourceQueries: ["q1"] },
        { placeId: "p2", sourceQueries: ["q2"] }
      ] as never,
      "nature_outdoors",
      getPlaceDetails
    );

    expect(result).toEqual([
      expect.objectContaining({
        name: "Park",
        placeId: "p1",
        category: "nature_outdoors",
        sourceQueries: ["q1"]
      })
    ]);
  });
});
