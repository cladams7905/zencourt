import {
  buildPerplexityCommunityMessages,
  getAudienceLabel
} from "@web/src/server/services/communityData/providers/perplexity/transport/prompts";

describe("perplexity prompts", () => {
  it("returns default audience label", () => {
    expect(getAudienceLabel()).toBe("local residents");
    expect(getAudienceLabel("growing_families")).toBe("growing families");
  });

  it("builds prompts with service areas and affordability notes", () => {
    const messages = buildPerplexityCommunityMessages({
      category: "dining",
      audience: "first_time_homebuyers",
      city: "Austin",
      state: "TX",
      zipCode: "78701",
      serviceAreas: ["Austin, TX"],
      limit: 3
    });

    expect(messages).toHaveLength(2);
    expect(messages[1].content).toContain(
      "Service areas to prioritize: Austin, TX."
    );
    expect(messages[1].content).toContain(
      "Prioritize affordable, budget-friendly options."
    );
    expect(messages[1].content).toContain("Provide up to 3 items.");
  });

  it("includes education-specific instructions", () => {
    const messages = buildPerplexityCommunityMessages({
      category: "education",
      city: "Austin",
      state: "TX"
    });

    expect(messages[1].content).toContain("Do NOT include K-12 schools");
  });

  it("omits empty service areas and supports category-specific notes", () => {
    const coffee = buildPerplexityCommunityMessages({
      category: "coffee_brunch",
      city: "Austin",
      state: "TX",
      serviceAreas: ["", "   "]
    });
    const events = buildPerplexityCommunityMessages({
      category: "community_events",
      city: "Austin",
      state: "TX"
    });
    const outdoors = buildPerplexityCommunityMessages({
      category: "nature_outdoors",
      city: "Austin",
      state: "TX"
    });

    expect(coffee[1].content).not.toContain("Service areas to prioritize");
    expect(coffee[1].content).toContain("Prefer local cafes or bakeries.");
    expect(events[1].content).toContain("Do not include past events.");
    expect(outdoors[1].content).toContain("short safety disclaimer");
  });
});
