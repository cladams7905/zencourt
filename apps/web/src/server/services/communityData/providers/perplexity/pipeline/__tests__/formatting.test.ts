import { formatPerplexityCategoryList } from "@web/src/server/services/communityData/providers/perplexity/pipeline/formatting";

describe("perplexity formatting", () => {
  it("returns none found for empty input", () => {
    expect(formatPerplexityCategoryList("dining", [])).toBe("- (none found)");
  });

  it("formats dining items with cuisine and audience label", () => {
    const result = formatPerplexityCategoryList(
      "dining",
      [
        {
          name: "Cafe Azul",
          location: "Downtown",
          drive_distance_minutes: 12,
          cost: "$$",
          cuisine: ["mexican", "seafood"],
          why_suitable_for_audience: "Family-friendly",
          description: "Local favorite"
        }
      ] as never,
      "growing families"
    );

    expect(result).toContain("- Cafe Azul");
    expect(result).toContain("Location: Downtown");
    expect(result).toContain("Est. drive time: 12 min");
    expect(result).toContain("Cost: $$");
    expect(result).toContain("Cuisine: mexican, seafood");
    expect(result).toContain(
      "Why suitable for growing families: Family-friendly"
    );
  });

  it("formats category-specific fields for events and nature", () => {
    const events = formatPerplexityCategoryList("community_events", [
      { name: "Farmers Market", dates: "Saturdays" }
    ] as never);
    const nature = formatPerplexityCategoryList("nature_outdoors", [
      { name: "Lake Trail", disclaimer: "Weather dependent" }
    ] as never);

    expect(events).toContain("Dates: Saturdays");
    expect(nature).toContain("Disclaimer: Weather dependent");
  });
});
