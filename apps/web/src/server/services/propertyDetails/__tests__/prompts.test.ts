import {
  PROPERTY_DETAILS_PROMPT_VERSION,
  buildPropertyDetailsSystemPrompt,
  buildPropertyDetailsUserPrompt
} from "@web/src/server/services/propertyDetails/prompts";

describe("propertyDetails prompts", () => {
  describe("PROPERTY_DETAILS_PROMPT_VERSION", () => {
    it("is a non-empty string", () => {
      expect(PROPERTY_DETAILS_PROMPT_VERSION).toBeDefined();
      expect(typeof PROPERTY_DETAILS_PROMPT_VERSION).toBe("string");
      expect(PROPERTY_DETAILS_PROMPT_VERSION.length).toBeGreaterThan(0);
    });
  });

  describe("buildPropertyDetailsSystemPrompt", () => {
    it("returns a non-empty string", () => {
      const prompt = buildPropertyDetailsSystemPrompt();
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("includes key instructions", () => {
      const prompt = buildPropertyDetailsSystemPrompt();
      expect(prompt).toContain("real estate property data researcher");
      expect(prompt).toContain("Return only JSON");
      expect(prompt).toContain("Do not fabricate");
    });
  });

  describe("buildPropertyDetailsUserPrompt", () => {
    it("interpolates the address", () => {
      const prompt = buildPropertyDetailsUserPrompt("123 Main St, Austin TX");
      expect(prompt).toContain("123 Main St, Austin TX");
      expect(prompt).toContain("Property address: 123 Main St, Austin TX.");
    });

    it("returns a non-empty string", () => {
      const prompt = buildPropertyDetailsUserPrompt("456 Oak Ave");
      expect(prompt).toBeDefined();
      expect(prompt.length).toBeGreaterThan(0);
    });

    it("includes key instructions", () => {
      const prompt = buildPropertyDetailsUserPrompt("any");
      expect(prompt).toContain("Provide property details in the schema");
      expect(prompt).toContain("US units");
      expect(prompt).toContain("open house events");
      expect(prompt).toContain("sources.citation");
    });
  });
});
