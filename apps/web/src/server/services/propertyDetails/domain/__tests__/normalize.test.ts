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
        open_house_events: [
          { date: "2026-03-07", start_time: "7:00 AM", end_time: "10:00 AM" },
          "bad-entry"
        ],
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
      open_house_events: [
        {
          date: "2026-03-07",
          start_time: "07:00",
          end_time: "10:00"
        }
      ],
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
        open_house_events: [],
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
      open_house_events: null,
      sale_history: null,
      valuation_estimates: null,
      location_context: null,
      sources: null
    });
  });

  it("infers AM/PM for open house times when not provided (7–11 AM, 12–6 PM)", () => {
    const result = normalizeListingPropertyDetails(
      {
        open_house_events: [
          { date: "2026-03-10", start_time: "9:00", end_time: "11:30" },
          { date: "2026-03-11", start_time: "12:00", end_time: "3:00" },
          { date: "2026-03-12", start_time: "2:30", end_time: "6:45" }
        ]
      },
      "fallback"
    );

    expect(result?.open_house_events).toEqual([
      { date: "2026-03-10", start_time: "09:00", end_time: "11:30" },
      { date: "2026-03-11", start_time: "12:00", end_time: "15:00" },
      { date: "2026-03-12", start_time: "14:30", end_time: "18:45" }
    ]);
  });

  it("normalizes open house event key aliases and time ranges", () => {
    const result = normalizeListingPropertyDetails(
      {
        open_house_events: [
          {
            event_date: "2026-03-08",
            time: "1:00 PM - 4:00 PM"
          },
          {
            date: "2026-03-09",
            startTime: "11:00 AM",
            endTime: "2:00 PM"
          }
        ]
      },
      "fallback"
    );

    expect(result).toEqual({
      address: "fallback",
      open_house_events: [
        {
          date: "2026-03-08",
          start_time: "13:00",
          end_time: "16:00"
        },
        {
          date: "2026-03-09",
          start_time: "11:00",
          end_time: "14:00"
        }
      ]
    });
  });

  it("falls back to null address when no fields are provided", () => {
    expect(normalizeListingPropertyDetails({}, undefined)).toEqual({
      address: null
    });
  });

  it("normalizes dropdown 'Other' values to null", () => {
    const result = normalizeListingPropertyDetails(
      {
        property_type: "Other",
        architecture: "other",
        location_context: {
          street_type: "OTHER",
          lot_type: "other"
        }
      },
      "fallback"
    );

    expect(result).toEqual({
      address: "fallback",
      property_type: null,
      architecture: null,
      location_context: {
        subdivision: undefined,
        street_type: null,
        lot_type: null,
        county: undefined,
        state: undefined
      }
    });
  });

  it("drops empty nested objects and preserves null example lists", () => {
    const result = normalizeListingPropertyDetails(
      {
        interior_features: {
          kitchen: {},
          primary_suite: "invalid-shape"
        },
        exterior_features: {},
        valuation_estimates: {
          third_party_examples: null
        },
        sources: [{ site: null, notes: null, citation: null }]
      },
      undefined
    );

    expect(result).toEqual(
      expect.objectContaining({
        address: null,
        interior_features: {
          kitchen: { features: undefined },
          primary_suite: undefined
        },
        valuation_estimates: {
          range_low_usd: undefined,
          range_high_usd: undefined,
          third_party_examples: null
        },
        sources: [{ site: null, notes: null, citation: null }]
      })
    );
  });
});
