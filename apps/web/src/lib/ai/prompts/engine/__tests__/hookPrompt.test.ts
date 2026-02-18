import {
  countTemplateWords,
  extractTemplateLines,
  uniqueTemplates,
  sampleTemplates,
  formatTemplateList,
  loadHookTemplates
} from "@web/src/lib/ai/prompts/engine/hookPrompt";
import { readPromptFile } from "@web/src/lib/ai/prompts/engine/promptFileCache";

jest.mock("@web/src/lib/ai/prompts/engine/promptFileCache", () => {
  const actual = jest.requireActual("@web/src/lib/ai/prompts/engine/promptFileCache");
  return {
    ...actual,
    readPromptFile: jest.fn(async (relativePath: string) => {
      if (relativePath === "hooks/global-hooks.md") {
        return "- Global one\n- Global two";
      }
      if (relativePath === "hooks/seasonal_hooks.md") {
        return "- Market update now\n- Cozy winter mornings";
      }
      return "- Category one\n- Category two\n- Category two";
    })
  };
});

describe("hookPrompt", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("covers template helper functions", () => {
    expect(countTemplateWords("{name} says hi!")).toBe(3);
    expect(extractTemplateLines("x\n- A\n- B\nno")).toEqual(["A", "B"]);
    expect(uniqueTemplates(["A", "A ", "B"])).toEqual(["A", "B"]);
    expect(formatTemplateList([])).toBe("- (none available)");
    expect(formatTemplateList(["A", "B"])).toBe("- A\n- B");
    expect(sampleTemplates(["a", "b"], 5)).toEqual(["a", "b"]);
  });

  it("loads and filters seasonal templates", async () => {
    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.1);

    const result = await loadHookTemplates({
      category: "seasonal",
      listing_subcategory: null
    } as never);

    expect(result.hookTemplates.length).toBeGreaterThan(0);
    expect(result.hookTemplates.some((item) => /market/i.test(item))).toBe(false);
    expect(readPromptFile).toHaveBeenCalledWith("hooks/global-hooks.md");

    randomSpy.mockRestore();
  });

  it("skips global hooks for listing subcategories", async () => {
    await loadHookTemplates({
      category: "listing",
      listing_subcategory: "new_listing"
    } as never);

    expect(readPromptFile).not.toHaveBeenCalledWith("hooks/global-hooks.md");
    expect(readPromptFile).toHaveBeenCalledWith("hooks/listing-new-listing-hooks.md");
  });
});
