import {
  extractZipFromZips,
  formatLocationDisplay,
  isPostalCodeInput,
  parseAddressComponents
} from "@web/src/components/location/domain/locationMappers";

describe("locationMappers", () => {
  it("parses address components into expected fields", () => {
    const parsed = parseAddressComponents([
      {
        long_name: "Seattle",
        short_name: "Seattle",
        types: ["locality"]
      } as google.maps.GeocoderAddressComponent,
      {
        long_name: "Washington",
        short_name: "WA",
        types: ["administrative_area_level_1"]
      } as google.maps.GeocoderAddressComponent,
      {
        long_name: "King County",
        short_name: "King County",
        types: ["administrative_area_level_2"]
      } as google.maps.GeocoderAddressComponent,
      {
        long_name: "United States",
        short_name: "US",
        types: ["country"]
      } as google.maps.GeocoderAddressComponent,
      {
        long_name: "98101",
        short_name: "98101",
        types: ["postal_code"]
      } as google.maps.GeocoderAddressComponent
    ]);

    expect(parsed).toEqual({
      city: "Seattle",
      state: "WA",
      country: "United States",
      postalCode: "98101",
      county: "King"
    });
  });

  it("formats US locations as city/state plus zip", () => {
    expect(
      formatLocationDisplay({
        city: "Seattle",
        state: "WA",
        country: "United States",
        postalCode: "98101",
        placeId: "p1",
        formattedAddress: "Seattle, WA 98101"
      })
    ).toBe("Seattle, WA 98101");
  });

  it("formats non-US locations as city/country", () => {
    expect(
      formatLocationDisplay({
        city: "Toronto",
        state: "ON",
        country: "Canada",
        placeId: "p2",
        formattedAddress: "Toronto, Canada"
      })
    ).toBe("Toronto, Canada");
  });

  it("extracts five-digit zip code from a zips string", () => {
    expect(extractZipFromZips("98101 98102")).toBe("98101");
    expect(extractZipFromZips("no zip")).toBe("");
  });

  it("validates postal input with optional dash-4", () => {
    expect(isPostalCodeInput("98101")).toBe(true);
    expect(isPostalCodeInput("98101-1234")).toBe(true);
    expect(isPostalCodeInput("98101  ")).toBe(true);
    expect(isPostalCodeInput("ABCDE")).toBe(false);
  });
});
