import {
  parseCommunityTemplate,
  buildCommunityDataPrompt,
  buildExtraSectionsPrompt
} from "@web/src/lib/ai/prompts/engine/communityPrompt";

describe("communityPrompt", () => {
  it("parses template sections", () => {
    const parsed = parseCommunityTemplate(
      "Intro\nSchools:\n{schools}\nParks:\n{parks}\n"
    );

    expect(parsed.header).toEqual(["Intro"]);
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.sections[0]?.key).toBe("schools");
  });

  it("builds prompt with selected keys and extras", () => {
    const result = buildCommunityDataPrompt(
      { schools: "A-rated", parks: "Many", nightlife: "n/a" } as never,
      "Header\nSchools:\n{schools}\nParks:\n{parks}\n",
      ["schools", "events"],
      { events: "Farmers market", ignored: "" }
    );

    expect(result).toContain("Schools:");
    expect(result).toContain("A-rated");
    expect(result).not.toContain("Parks:");
    expect(result).toContain("events:\nFarmers market");
  });

  it("builds extra section prompt only for meaningful values", () => {
    expect(
      buildExtraSectionsPrompt({ a: "one", b: "  ", c: "two" })
    ).toBe("a:\none\nc:\ntwo");
  });
});
