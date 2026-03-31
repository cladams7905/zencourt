import { listingStreetLineFromAddress } from "../address";

describe("listingStreetLineFromAddress", () => {
  it("returns the segment before the first comma", () => {
    expect(
      listingStreetLineFromAddress("123 Market St, Seattle, WA 98101, USA")
    ).toBe("123 Market St");
  });

  it("returns trimmed single-line addresses unchanged", () => {
    expect(listingStreetLineFromAddress("  456 Oak Ave  ")).toBe("456 Oak Ave");
  });

  it("returns empty string for null, undefined, or whitespace", () => {
    expect(listingStreetLineFromAddress(null)).toBe("");
    expect(listingStreetLineFromAddress(undefined)).toBe("");
    expect(listingStreetLineFromAddress("   ")).toBe("");
  });
});
