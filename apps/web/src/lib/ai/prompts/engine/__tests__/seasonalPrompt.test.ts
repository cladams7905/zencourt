import { buildTimeOfYearNote } from "@web/src/lib/ai/prompts/engine/seasonalPrompt";

describe("seasonalPrompt", () => {
  it("builds month-aware note", () => {
    const note = buildTimeOfYearNote(new Date("2026-10-20T12:00:00Z"));
    expect(note).toContain("October 2026");
    expect(note).toContain("Halloween");
  });
});
