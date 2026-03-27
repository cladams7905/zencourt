import { assembleProviderPrompt, buildPrompt } from "../prompt";

describe("videoGeneration/domain/prompt", () => {
  it("uses injected picker and returns the motion prompt only", () => {
    const result = buildPrompt({
      roomName: "Kitchen",
      category: "kitchen",
      picker: (templates) => templates[0]
    });

    expect(result.templateKey).toBe("interior-forward-pan");
    expect(result.prompt).toBe("Forward pan through the Kitchen.");
  });

  it("assembles provider prompts by appending hard constraints", () => {
    expect(
      assembleProviderPrompt("Forward pan through the Kitchen.")
    ).toBe(
      "Forward pan through the Kitchen. No people. No added objects. Keep architecture and materials unchanged. Single continuous camera movement only. Full-bleed, edge-to-edge composition from the first frame, filling the entire video frame at all times. Start already full-screen. No framed or inset opening, no letterboxing or pillarboxing, and no fades, transitions, cuts, or scene changes."
    );
  });

  it("filters previous template key before selection", () => {
    const seenKeys: string[] = [];
    const result = buildPrompt({
      roomName: "Bedroom 2",
      category: "bedroom-2",
      previousTemplateKey: "bedroom-center-push",
      picker: (templates) => {
        seenKeys.push(...templates.map((template) => template.key));
        return templates[0];
      }
    });

    expect(seenKeys).not.toContain("bedroom-center-push");
    expect(result.templateKey).not.toBe("bedroom-center-push");
  });

  it("uses non-reveal non-push interior motion templates", () => {
    const seenTemplates: string[] = [];

    buildPrompt({
      roomName: "Kitchen",
      category: "kitchen",
      picker: (templates) => {
        seenTemplates.push(...templates.map((template) => template.template));
        return templates[0];
      }
    });

    expect(seenTemplates).not.toContain(
      "Steady push-in toward the center of the {roomName}."
    );
    expect(seenTemplates).not.toContain(
      "Gentle corner reveal into the {roomName}."
    );
  });

  it("normalizes exterior room names in prompt output", () => {
    const front = buildPrompt({
      roomName: "Exterior Front",
      category: "exterior-front",
      picker: (templates) => templates[0]
    });
    const backyard = buildPrompt({
      roomName: "Exterior Backyard",
      category: "exterior-backyard",
      picker: (templates) => templates[0]
    });

    expect(front.prompt).toContain("front of the house");
    expect(backyard.prompt).toContain("back of the house");
  });
});
