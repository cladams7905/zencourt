import {
  CLASSIFICATION_PROMPT,
  CLASSIFICATION_PROMPT_VERSION
} from "../prompt";

describe("roomClassification prompt", () => {
  it("contains required response contract", () => {
    expect(CLASSIFICATION_PROMPT).toContain("RESPONSE FORMAT:");
    expect(CLASSIFICATION_PROMPT).toContain('"category"');
    expect(CLASSIFICATION_PROMPT).toContain('"confidence"');
    expect(CLASSIFICATION_PROMPT).toContain('"primary_score"');
    expect(CLASSIFICATION_PROMPT).toContain('"perspective"');
  });

  it("includes fallback guidance to classify uncertain images as other", () => {
    expect(CLASSIFICATION_PROMPT).toContain('use "other"');
    expect(CLASSIFICATION_PROMPT).toContain('category MUST be "other"');
  });

  it("exposes a prompt version string", () => {
    expect(CLASSIFICATION_PROMPT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}\.\d+$/);
  });
});
