import { AIVisionError } from "../errors";
import {
  parseClassificationResponse,
  validateClassification
} from "../parsing";

describe("roomClassification/parsing", () => {
  it("parses classification content (including fenced JSON)", () => {
    const parsed = parseClassificationResponse(`
\`\`\`json
{"category":"kitchen","confidence":"0.91","primaryScore":0.8,"perspective":"ground"}
\`\`\`
`);

    expect(parsed).toEqual({
      category: "kitchen",
      confidence: 0.91,
      primaryScore: 0.8,
      perspective: "ground"
    });
  });

  it("throws INVALID_RESPONSE when JSON parsing fails", () => {
    expect(() => parseClassificationResponse("not-json")).toThrow(AIVisionError);
    expect(() => parseClassificationResponse("not-json")).toThrow(
      "Failed to parse AI response as JSON"
    );
  });

  it("validates supported category/confidence/primary score", () => {
    expect(() =>
      validateClassification({
        category: "kitchen",
        confidence: 0.5,
        primaryScore: 0.7
      })
    ).not.toThrow();

    expect(() =>
      validateClassification({
        category: "bad-category" as never,
        confidence: 0.5
      })
    ).toThrow("Invalid room category");

    expect(() =>
      validateClassification({
        category: "kitchen",
        confidence: 5
      })
    ).toThrow("Invalid confidence value");

    expect(() =>
      validateClassification({
        category: "kitchen",
        confidence: 0.5,
        primaryScore: 2
      })
    ).toThrow("Invalid primary_score value");
  });
});
