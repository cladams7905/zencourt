import {
  getAvailableMotionVariants,
  buildNegativePrompt,
  buildPrompt,
  combinePromptPartsForProvider
} from "../prompt";

describe("videoGeneration/domain/prompt", () => {
  it("uses injected picker and returns the motion prompt only", () => {
    const result = buildPrompt({
      roomName: "Kitchen",
      category: "kitchen",
      picker: (templates) => templates[0]
    });

    expect(result.templateKey).toBe("interior-forward-pan");
    expect(result.prompt).toBe("Slow forward pan through the Kitchen.");
  });

  it("builds the negative prompt as compliance constraints only", () => {
    expect(buildNegativePrompt()).toBe(
      "No people. No added objects. Keep architecture and materials unchanged. No scene changes. No added transitions. Single continuous camera movement at a fixed speed only."
    );
  });

  it("combines prompt parts only when a provider needs a single prompt string", () => {
    expect(
      combinePromptPartsForProvider({
        prompt: "Forward pan through the Kitchen.",
        negativePrompt: buildNegativePrompt()
      })
    ).toBe(
      "Forward pan through the Kitchen. No people. No added objects. Keep architecture and materials unchanged. No scene changes. No added transitions. Single continuous camera movement at a fixed speed only."
    );
  });

  it("filters previous template key before selection", () => {
    const seenKeys: string[] = [];
    const result = buildPrompt({
      roomName: "Bedroom 2",
      category: "bedroom-2",
      previousTemplateKey: "interior-forward-pan",
      picker: (templates) => {
        seenKeys.push(...templates.map((template) => template.key));
        return templates[0];
      }
    });

    expect(seenKeys).not.toContain("interior-forward-pan");
    expect(result.templateKey).not.toBe("interior-forward-pan");
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
      roomName: "Exterior (Front)",
      category: "exterior-front",
      picker: (templates) => templates[0]
    });
    const back = buildPrompt({
      roomName: "Exterior (Back)",
      category: "exterior-back",
      picker: (templates) => templates[0]
    });

    expect(front.prompt).toContain("front of the house");
    expect(back.prompt).toContain("back of the house");
  });

  it("exposes available motion variants for interior rooms", () => {
    expect(getAvailableMotionVariants("kitchen")).toEqual([
      expect.objectContaining({ id: "default", label: "Default" }),
      expect.objectContaining({ id: "pan", label: "Pan" }),
      expect.objectContaining({ id: "tracking", label: "Tracking" }),
      expect.objectContaining({ id: "orbital", label: "Orbital" }),
      expect.objectContaining({ id: "blur-to-focus", label: "Blur to Focus" })
    ]);
  });

  it("honors an explicit motion variant instead of random selection", () => {
    const result = buildPrompt({
      roomName: "Kitchen",
      category: "kitchen",
      motionVariantId: "tracking",
      picker: () => {
        throw new Error("picker should not be called for explicit variants");
      }
    });

    expect(result.templateKey).toBe("interior-lateral-track");
    expect(result.prompt).toBe("Steady lateral tracking shot across the Kitchen.");
  });

  it("guides blur-to-focus prompts to add only subtle foreground motivation when needed", () => {
    const result = buildPrompt({
      roomName: "Kitchen",
      category: "kitchen",
      motionVariantId: "blur-to-focus"
    });

    expect(result.templateKey).toBe("interior-rack-focus");
    expect(result.prompt).toContain(
      "If the source image has no natural foreground occlusion"
    );
    expect(result.prompt).toContain(
      "keeping the room layout, architecture, and materials unchanged"
    );
  });
});
