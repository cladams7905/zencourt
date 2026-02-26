import { applyTemplatePolicies } from "../index";

describe("templateRender/policies/applyTemplatePolicies", () => {
  it("applies default medium header length when omitted", () => {
    const result = applyTemplatePolicies({
      resolvedParameters: {
        headerText: "One two three four five six",
        subheader1Text: "",
        subheader2Text: "",
        listingAddress: "100 State St",
        feature1: "Garage"
      },
      subcategory: "new_listing"
    });

    expect(result.headerText).toBe("One two three four five");
    expect(result.subheader1Text).toBe("100 State St");
    expect(result.subheader2Text).toBe("Garage");
  });

  it("applies parameter policies when details/contactSource are provided", () => {
    const result = applyTemplatePolicies({
      resolvedParameters: {
        headerText: "One two three four five six",
        listingAddress: "123 Main St, Austin, TX 78701, United States",
        agentTitle: "Realtor",
        agencyName: "Acme Realty"
      },
      details: {
        bedrooms: 4,
        bathrooms: 3,
        living_area_sq_ft: 2500
      },
      contactSource: {
        email: "agent@example.com"
      },
      subcategory: "new_listing",
      random: () => 0
    });

    expect(result.listingAddress).toBe("123 Main St, Austin, TX");
    expect(result.featureList).toBe("4 beds, 3 baths, 2,500 sq. ft.");
    expect(result.agentContactInfo).toBe("Realtor | Acme Realty | agent@example.com");
  });
});
