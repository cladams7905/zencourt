import { applyTemplatePolicies } from "../index";

describe("templateRender/policies/applyTemplatePolicies", () => {
  it("applies default medium header hooks when header length is omitted", async () => {
    const result = await applyTemplatePolicies({
      resolvedParameters: {
        headerText: "One two three four five six",
        subheader1Text: "",
        subheader2Text: "",
        listingAddress: "100 State St",
        feature1: "Garage"
      },
      subcategory: "new_listing",
      rotationKey: "apply-default-medium",
      random: () => 0
    });

    expect(typeof result.headerText).toBe("string");
    expect(result.headerText?.trim().length).toBeGreaterThan(0);
    expect(result.subheader1Text?.trim().length).toBeGreaterThan(0);
    expect(result.subheader2Text).toBe("Garage");
    expect(result.garageLabel).toBe("");
    expect(result.socialHandleIcon).toBe(
      "https://upload.wikimedia.org/wikipedia/commons/c/ce/Transparent.gif"
    );
  });

  it("applies parameter policies when details/contactSource are provided", async () => {
    const result = await applyTemplatePolicies({
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
      rotationKey: "apply-parameter-policies",
      random: () => 0
    });

    expect(result.listingAddress).toBe("123 Main St, Austin, TX");
    expect(result.featureList).toBe("4 beds, 3 baths, 2,500 sq. ft.");
    expect(result.agentContactInfo).toBe("Realtor | Acme Realty | agent@example.com");
  });

  it("applies template flags for uppercase header and address-only subheaders", async () => {
    const result = await applyTemplatePolicies({
      resolvedParameters: {
        headerText: "welcome home",
        subheader1Text: "AI Subheader",
        subheader2Text: "AI Subheader 2",
        listingAddress: "100 State St"
      },
      headerLength: "long",
      forceUppercaseHeader: true,
      forceListingAddressSubheader: true,
      subcategory: "new_listing"
    });

    expect(result.headerText).toBe("WELCOME HOME");
    expect(result.subheader1Text).toBe("100 State St");
    expect(result.subheader2Text).toBe("100 State St");
  });

  it("sets socialHandleIcon URL when socialHandle is configured", async () => {
    const result = await applyTemplatePolicies({
      resolvedParameters: {
        headerText: "welcome home",
        socialHandle: "@agent"
      },
      headerLength: "long",
      subcategory: "new_listing"
    });

    expect(result.socialHandle).toBe("@agent");
    expect(result.socialHandleIcon).toBe(
      "https://cdn.orshot.com/elements/icons/logos/instagram.svg"
    );
  });
});
