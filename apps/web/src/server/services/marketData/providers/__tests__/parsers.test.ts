import {
  parseFredObservationResponse,
  parseRentCastMarketResponse
} from "../parsers";

describe("marketData/providers/parsers", () => {
  it("normalizes rentcast payload from array/object/fallback", () => {
    const fromArray = parseRentCastMarketResponse([{ value: 1 }]);
    const fromObject = parseRentCastMarketResponse({ value: 2 });
    const fromInvalid = parseRentCastMarketResponse("invalid");

    expect(fromArray).toEqual([{ value: 1 }]);
    expect(fromObject).toEqual({ value: 2 });
    expect(fromInvalid).toEqual({});
  });

  it("normalizes fred observations and filters invalid entries", () => {
    expect(parseFredObservationResponse("invalid")).toEqual({});
    expect(parseFredObservationResponse({ observations: "invalid" })).toEqual(
      {}
    );
    expect(
      parseFredObservationResponse({
        observations: [{ value: "1.2" }, null, "bad", { value: "2.0" }]
      })
    ).toEqual({
      observations: [{ value: "1.2" }, { value: "2.0" }]
    });
  });
});
