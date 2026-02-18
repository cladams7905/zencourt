import { formatLocationForStorage } from "@web/src/lib/domain/location/formatters";

describe("location formatters", () => {
  it("formats US locations with state and zip", () => {
    expect(
      formatLocationForStorage({
        city: "Austin",
        state: "TX",
        country: "United States",
        postalCode: "78701",
        placeId: "p",
        formattedAddress: ""
      })
    ).toBe("Austin, TX 78701");
  });

  it("formats international locations with city and country", () => {
    expect(
      formatLocationForStorage({
        city: "Toronto",
        state: "ON",
        country: "Canada",
        placeId: "p",
        formattedAddress: ""
      })
    ).toBe("Toronto, Canada");
  });
});
