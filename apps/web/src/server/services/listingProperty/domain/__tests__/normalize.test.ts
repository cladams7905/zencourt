import { normalizeListingPropertyDetails } from "../normalize";

describe("listingProperty/domain/normalize", () => {
  it("normalizes nested property fields and scalar values", () => {
    const result = normalizeListingPropertyDetails(
      {
        address: "  123 Main St ",
        bedrooms: "4",
        bathrooms: 2.5,
        year_built: "1995",
        living_area_sq_ft: "2500",
        listing_price: "650000",
        living_spaces: ["Living Room", " ", null, "Den"],
        additional_spaces: ["Office"],
        exterior_features: {
          materials: ["Brick", "", null],
          highlights: ["Pool", "Deck"]
        },
        interior_features: {
          kitchen: { features: ["Island", ""] },
          primary_suite: null
        },
        sale_history: [
          { event: "sold", sale_price_usd: "500000" },
          "bad-entry"
        ],
        valuation_estimates: {
          range_low_usd: "600000",
          range_high_usd: 700000,
          third_party_examples: [{ provider: "Zillow", value_usd: "675000" }]
        },
        location_context: {
          county: "County Name",
          state: "CA"
        },
        sources: [{ site: "MLS", notes: "public record", citation: "ABC-123" }]
      },
      "fallback address"
    );

    expect(result).toEqual({
      address: "123 Main St",
      bedrooms: 4,
      bathrooms: 2.5,
      year_built: 1995,
      living_area_sq_ft: 2500,
      listing_price: 650000,
      living_spaces: ["Living Room", "Den"],
      additional_spaces: ["Office"],
      exterior_features: {
        materials: ["Brick"],
        highlights: ["Pool", "Deck"]
      },
      interior_features: {
        kitchen: { features: ["Island"] },
        primary_suite: null
      },
      sale_history: [
        {
          event: "sold",
          close_date: undefined,
          sale_price_usd: 500000,
          price_per_sq_ft_usd: undefined,
          list_to_sale_percent_change: undefined,
          list_price_usd: undefined
        }
      ],
      valuation_estimates: {
        range_low_usd: 600000,
        range_high_usd: 700000,
        third_party_examples: [{ provider: "Zillow", value_usd: 675000 }]
      },
      location_context: {
        subdivision: undefined,
        street_type: undefined,
        lot_type: undefined,
        county: "County Name",
        state: "CA"
      },
      sources: [{ site: "MLS", notes: "public record", citation: "ABC-123" }]
    });
  });

  it("uses fallback address and keeps explicit nulls", () => {
    const result = normalizeListingPropertyDetails(
      {
        exterior_features: null,
        sale_history: [],
        valuation_estimates: null,
        location_context: null,
        sources: []
      },
      "  fallback  "
    );

    expect(result).toEqual({
      address: "fallback",
      exterior_features: null,
      sale_history: null,
      valuation_estimates: null,
      location_context: null,
      sources: null
    });
  });

  it("falls back to null address when no fields are provided", () => {
    expect(normalizeListingPropertyDetails({}, undefined)).toEqual({
      address: null
    });
  });
});
