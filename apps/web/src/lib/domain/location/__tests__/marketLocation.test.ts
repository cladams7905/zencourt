import { parseMarketLocation } from "@web/src/lib/domain/location/marketLocation";

describe("parseMarketLocation", () => {
  it("parses city/state/zip from a valid location string", () => {
    expect(parseMarketLocation("Austin, TX 78701")).toEqual({
      city: "Austin",
      state: "TX",
      zip_code: "78701"
    });
  });

  it("returns null when location is missing required fields", () => {
    expect(parseMarketLocation(null)).toBeNull();
    expect(parseMarketLocation("Austin, TX")).toBeNull();
    expect(parseMarketLocation(" , TX 78701")).toBeNull();
  });
});
