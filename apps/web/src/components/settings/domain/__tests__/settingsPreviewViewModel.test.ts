import {
  buildBrandingPreviewModel,
  resolveWritingToneLabel
} from "@web/src/components/settings/domain/settingsPreviewViewModel";

describe("settingsPreviewViewModel", () => {
  it("resolves numeric tone labels", () => {
    expect(resolveWritingToneLabel(1)).toBe("Very informal");
    expect(resolveWritingToneLabel("5" as never)).toBe("Very formal");
  });

  it("resolves legacy tone labels and falls back to Custom", () => {
    expect(resolveWritingToneLabel("professional" as never)).toBe("Professional");
    expect(resolveWritingToneLabel("unknown" as never)).toBe("Custom");
    expect(resolveWritingToneLabel(null)).toBe("Custom");
  });

  it("builds preview model with user defaults", () => {
    const model = buildBrandingPreviewModel({
      userAdditional: {
        agentName: "Alex Rivera",
        brokerageName: "Rivera Group",
        agentTitle: "Realtor",
        writingStyleCustom: " warm and concise ",
        writingToneLevel: 4
      } as never,
      userName: "Fallback Name",
      location: "Austin, TX"
    });

    expect(model).toEqual({
      writingToneLabel: "Formal",
      writingStyleNote: "warm and concise",
      headline: "Just Listed in Austin, TX",
      signature: "Alex Rivera · Realtor · Rivera Group"
    });
  });

  it("uses fallbacks when optional profile data is missing", () => {
    const model = buildBrandingPreviewModel({
      userAdditional: {
        writingToneLevel: null,
        agentName: "",
        brokerageName: "",
        agentTitle: ""
      } as never,
      userName: "Jordan Lee"
    });

    expect(model.writingToneLabel).toBe("Custom");
    expect(model.headline).toBe("Just Listed: A Fresh New Opportunity");
    expect(model.signature).toBe("Jordan Lee · Your Brokerage");
  });
});
