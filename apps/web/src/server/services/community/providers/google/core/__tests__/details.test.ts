import {
  deriveSummaryKeywords,
  buildCategoryListWithDetails,
  hydratePlacesFromItems
} from "@web/src/server/services/community/providers/google/core/places/details";

describe("google place details", () => {
  it("uses generative summary when available", () => {
    expect(
      deriveSummaryKeywords({
        generativeSummary: { overview: { text: " Great place " } }
      } as never)
    ).toEqual({ summary: "Great place" });
  });

  it("derives keywords from non-generic types", () => {
    expect(
      deriveSummaryKeywords({
        primaryType: "cafe",
        types: ["food", "bakery_store"]
      } as never)
    ).toEqual({ keywords: ["cafe", "bakery store"] });
  });

  it("hydrates and formats category list", async () => {
    const getPlaceDetails = jest.fn().mockResolvedValue({
      displayName: { text: "Cafe Azul" },
      formattedAddress: "Downtown",
      rating: 4.7,
      userRatingCount: 120,
      types: ["restaurant"]
    });

    const result = await buildCategoryListWithDetails(
      "dining",
      [
        {
          name: "Cafe Azul",
          rating: 4.5,
          reviewCount: 100,
          address: "",
          category: "dining",
          placeId: "p1"
        }
      ],
      3,
      getPlaceDetails
    );

    expect(result).toContain("Cafe Azul");
    expect(getPlaceDetails).toHaveBeenCalledWith("p1");
  });

  it("hydrates places from cached pool items", async () => {
    const getPlaceDetails = jest
      .fn()
      .mockResolvedValueOnce({
        displayName: { text: "Museum" },
        formattedAddress: "Main St",
        rating: 4.6,
        userRatingCount: 80,
        types: ["museum"]
      })
      .mockResolvedValueOnce(null);

    const result = await hydratePlacesFromItems(
      [
        { placeId: "p1", sourceQueries: ["q1"] },
        { placeId: "p2" }
      ],
      "attractions",
      getPlaceDetails
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        name: "Museum",
        category: "attractions",
        sourceQueries: ["q1"]
      })
    );
  });
});
