import { applyContactPolicy } from "../contact";

describe("templateRender/policies/contact", () => {
  it("prioritizes title and agency and appends one random optional contact", () => {
    const result = applyContactPolicy({
      resolvedParameters: {
        agentTitle: "Realtor",
        agencyName: "Acme Realty"
      },
      contactSource: {
        website: "https://agent.example.com",
        phoneNumber: "(555) 111-2222",
        email: "agent@example.com"
      },
      random: () => 0.7
    });

    expect(result.agentContactInfo).toBe("Realtor | Acme Realty | agent@example.com");
    expect(result.agentContact1).toBe("Realtor");
    expect(result.agentContact2).toBe("Acme Realty");
    expect(result.agentContact3).toBe("agent@example.com");
  });
});
