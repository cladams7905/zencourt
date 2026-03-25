import {
  clearPromptCache,
  readPromptFile
} from "@web/src/lib/ai/prompts/engine/promptFileCache";

describe("promptFileCache", () => {
  beforeEach(() => {
    clearPromptCache();
  });

  it("reads prompt content and serves cached values on repeated calls", async () => {
    const first = await readPromptFile("hooks/listing-hooks.md");
    const second = await readPromptFile("hooks/listing-hooks.md");

    expect(first.length).toBeGreaterThan(0);
    expect(second).toBe(first);
  });

  it("clears cached entries", async () => {
    const first = await readPromptFile("hooks/community-hooks.md");
    clearPromptCache();
    const second = await readPromptFile("hooks/community-hooks.md");

    expect(second).toBe(first);
  });

  it("loads listing base prompt with fair housing guidance", async () => {
    const prompt = await readPromptFile("basePrompts/listing-base-prompt.md");

    expect(prompt).toContain("Avoid fair housing risk language");
    expect(prompt).toContain('"perfect for families,"');
    expect(prompt).toContain("FHA");
  });
});
