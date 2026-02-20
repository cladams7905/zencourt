import { parseRequiredRouteParam } from "..";

describe("api/parsers", () => {
  it("parses required route params from string and array", () => {
    expect(parseRequiredRouteParam(" listing-1 ", "listingId")).toBe(
      "listing-1"
    );
    expect(
      parseRequiredRouteParam([" listing-2 ", "ignored"], "listingId")
    ).toBe("listing-2");
  });

  it("throws when route param is missing or empty", () => {
    expect(() => parseRequiredRouteParam(undefined, "listingId")).toThrow(
      "listingId is required"
    );
    expect(() => parseRequiredRouteParam("   ", "listingId")).toThrow(
      "listingId is required"
    );
  });
});
