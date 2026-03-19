import { buildPrompt } from "../prompt";

describe("videoGeneration/domain/prompt", () => {
  it("uses injected picker and appends constraints", () => {
    const result = buildPrompt({
      roomName: "Kitchen",
      category: "kitchen",
      picker: (templates) => templates[0]
    });

    expect(result.templateKey).toBe("interior-forward-pan");
    expect(result.prompt).toContain("Forward pan through the Kitchen.");
    expect(result.prompt).toContain(
      "No people. No added objects. Keep architecture and materials unchanged."
    );
    expect(result.prompt).toContain(
      "No transitions, cuts, fades, dissolves, zoom bursts, or scene changes. Single continuous camera movement only."
    );
  });

  it("includes ai directions before hard constraints", () => {
    const result = buildPrompt({
      roomName: "Kitchen",
      category: "kitchen",
      aiDirections: "Warm morning light. Preserve natural staging.",
      picker: (templates) => templates[0]
    });

    expect(result.prompt).toContain(
      "Forward pan through the Kitchen. Warm morning light. Preserve natural staging."
    );
    expect(result.prompt).toContain(
      "No people. No added objects. Keep architecture and materials unchanged."
    );
  });

  it("ignores blank ai directions", () => {
    const result = buildPrompt({
      roomName: "Kitchen",
      category: "kitchen",
      aiDirections: "   ",
      picker: (templates) => templates[0]
    });

    expect(result.prompt).toBe(
      "Forward pan through the Kitchen. No people. No added objects. Keep architecture and materials unchanged. No transitions, cuts, fades, dissolves, zoom bursts, or scene changes. Single continuous camera movement only."
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
