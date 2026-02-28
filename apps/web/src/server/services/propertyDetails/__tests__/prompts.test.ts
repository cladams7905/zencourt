import {
  PROPERTY_DETAILS_PROMPT_VERSION,
  buildOpenHouseSystemPrompt,
  buildOpenHouseUserPrompt,
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
      expect(prompt).toContain("2-3 words max");
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
      expect(prompt).toContain("sources.citation");
    });
  });

  describe("open house prompts", () => {
    it("buildOpenHouseSystemPrompt includes active-listing guidance", () => {
      const prompt = buildOpenHouseSystemPrompt();
      expect(prompt).toContain("open house schedules");
      expect(prompt).toContain("active for-sale listing pages");
      expect(prompt).toContain("Do not fabricate");
    });

    it("buildOpenHouseUserPrompt includes address and source guidance", () => {
      const prompt = buildOpenHouseUserPrompt("123 Main St, Austin TX");
      expect(prompt).toContain("Are there any open houses for 123 Main St, Austin TX?");
      expect(prompt).toContain("structured output");
      expect(prompt).toContain("search only zillow.com, redfin.com, and realtor.com");
    });

    it("buildOpenHouseUserPrompt includes preferred listing URLs when provided", () => {
      const prompt = buildOpenHouseUserPrompt("123 Main St, Austin TX", [
        "https://www.zillow.com/homedetails/test"
      ]);
      expect(prompt).toContain("Use only these verified listing URLs as evidence");
      expect(prompt).toContain("https://www.zillow.com/homedetails/test");
    });
  });
});
