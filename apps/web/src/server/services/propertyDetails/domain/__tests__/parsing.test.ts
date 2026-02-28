import { parseListingPropertyRaw } from "../parsing";

describe("listingProperty/domain/parsing", () => {
  it("returns null for non-record payloads", () => {
    expect(parseListingPropertyRaw(null)).toBeNull();
    expect(parseListingPropertyRaw([])).toBeNull();
    expect(parseListingPropertyRaw("invalid")).toBeNull();
  });

  it("keeps only allowed top-level keys", () => {
    const parsed = parseListingPropertyRaw({
      address: "123 Main St",
      bedrooms: 3,
      open_house_events: [{ date: "2026-03-01" }],
      unknown_key: "drop me"
    });

    expect(parsed).toEqual({
      address: "123 Main St",
      bedrooms: 3,
      open_house_events: [{ date: "2026-03-01" }]
    });
  });

  it("drops unknown top-level keys, including camelCase variants", () => {
    const parsed = parseListingPropertyRaw({
      openHouseEvents: [{ date: "2026-03-01" }]
    });

    expect(parsed).toEqual({});
  });
});
