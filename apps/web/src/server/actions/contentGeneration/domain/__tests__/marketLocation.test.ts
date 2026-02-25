import { parseMarketLocation } from "@web/src/server/actions/contentGeneration/domain/marketLocation";

describe("contentGeneration/domain/marketLocation", () => {
  describe("parseMarketLocation", () => {
    it("returns null for null, undefined, or empty string", () => {
      expect(parseMarketLocation(null)).toBeNull();
      expect(parseMarketLocation(undefined)).toBeNull();
      expect(parseMarketLocation("")).toBeNull();
    });

    it("parses valid location with city, state and zip", () => {
      expect(parseMarketLocation("Austin, TX 78701")).toEqual({
        city: "Austin",
        state: "TX",
        zip_code: "78701"
      });
    });

    it("parses location with zip+4", () => {
      expect(parseMarketLocation("Seattle, WA 98101-1234")).toEqual({
        city: "Seattle",
        state: "WA",
        zip_code: "98101-1234"
      });
    });

    it("returns null when city is missing", () => {
      expect(parseMarketLocation(", CA 90210")).toBeNull();
    });

    it("returns null when zip is missing", () => {
      expect(parseMarketLocation("LA, CA")).toBeNull();
    });

    it("returns null when state is missing", () => {
      expect(parseMarketLocation("LA 90210")).toBeNull();
    });
  });
});
