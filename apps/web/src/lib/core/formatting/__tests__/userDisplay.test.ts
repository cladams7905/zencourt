import {
  getUserDisplayNames,
  getUserEmailInfo,
  getUserNameParts,
  getDefaultAgentName,
  getDefaultHeadshotUrl,
  isGoogleUserAccount,
  getLocationLabel,
  getPaymentPlanLabel
} from "@web/src/lib/core/formatting/userDisplay";

describe("userDisplay", () => {
  it("builds google user display names and headshot", () => {
    const user = {
      primaryEmail: "alex@example.com",
      displayName: "Alex Agent",
      oauthProviders: [{ id: "google" }],
      profileImageUrl: "https://img"
    } as never;

    expect(getUserDisplayNames(user)).toEqual({
      headerName: "Alex",
      sidebarName: "Alex Agent"
    });
    expect(getDefaultHeadshotUrl(user)).toBe("https://img");
    expect(isGoogleUserAccount(user)).toBe(true);
  });

  it("builds non-google defaults", () => {
    const user = {
      primaryEmail: "sam@domain.com",
      displayName: "",
      oauthProviders: []
    } as never;

    expect(getUserDisplayNames(user)).toEqual({
      headerName: "sam",
      sidebarName: "sam@domain.com"
    });
    expect(getDefaultAgentName(user)).toBe("");
    expect(getDefaultHeadshotUrl(user)).toBe("");
  });

  it("parses email/name/location/plan helpers", () => {
    const user = {
      primaryEmail: "pat@domain.com",
      displayName: "  Pat  Morgan  "
    } as never;

    expect(getUserEmailInfo(user)).toEqual({ email: "pat@domain.com", emailUsername: "pat" });
    expect(getUserNameParts(user)).toEqual({ displayName: "Pat  Morgan", nameParts: ["Pat", "Morgan"] });
    expect(getDefaultAgentName(user)).toBe("Pat Morgan");

    expect(getLocationLabel("Austin, TX, USA")).toBe("Austin, TX");
    expect(getLocationLabel(null)).toBe("Location not set");

    expect(getPaymentPlanLabel("growth")).toBe("Growth");
    expect(getPaymentPlanLabel("unknown")).toBe("Free");
  });
});
