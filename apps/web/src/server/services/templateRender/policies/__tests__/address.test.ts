import { sanitizeAddress } from "../address";

describe("templateRender/policies/address", () => {
  it("removes postal code and trailing country", () => {
    expect(sanitizeAddress("123 Main St, Austin, TX 78701, United States")).toBe(
      "123 Main St, Austin, TX"
    );
  });
});
