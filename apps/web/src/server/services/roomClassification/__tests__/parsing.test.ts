import { RoomClassificationError } from "../errors";
import {
  parseClassificationResponse,
  validateClassification
} from "../parsing";

describe("roomClassification/parsing", () => {
  it("parses classification content (including fenced JSON)", () => {
    const parsed = parseClassificationResponse(`
\`\`\`json
{"category":"kitchen","confidence":"0.91","shot_type":"room","feature_tags":["island"],"scores":{"lighting":0.8,"framing":0.7,"coverage":0.9,"clarity":0.85,"motion_potential":0.75,"room_representativeness":0.9},"perspective":"ground"}
\`\`\`
`);

    expect(parsed).toEqual({
      category: "kitchen",
      confidence: 0.91,
      shotType: "room",
      featureTags: ["island"],
      scores: {
        lighting: 0.8,
        framing: 0.7,
        coverage: 0.9,
        clarity: 0.85,
        motionPotential: 0.75,
        roomRepresentativeness: 0.9,
        featureAppeal: undefined
      },
      perspective: "ground"
    });
  });

  it("throws INVALID_RESPONSE when JSON parsing fails", () => {
    expect(() => parseClassificationResponse("not-json")).toThrow(
      RoomClassificationError
    );
    expect(() => parseClassificationResponse("not-json")).toThrow(
      "Failed to parse AI response as JSON"
    );
  });

  it("validates supported category/confidence/shot type/scores", () => {
    expect(() =>
      validateClassification({
        category: "kitchen",
        confidence: 0.5,
        shotType: "room",
        featureTags: [],
        scores: {
          lighting: 0.7,
          framing: 0.7,
          coverage: 0.7,
          clarity: 0.7,
          motionPotential: 0.7,
          roomRepresentativeness: 0.7
        }
      })
    ).not.toThrow();

    expect(() =>
      validateClassification({
        category: "bad-category" as never,
        confidence: 0.5,
        shotType: "room",
        featureTags: [],
        scores: {
          lighting: 0.5,
          framing: 0.5,
          coverage: 0.5,
          clarity: 0.5,
          motionPotential: 0.5
        }
      })
    ).toThrow("Invalid room category");

    expect(() =>
      validateClassification({
        category: "kitchen",
        confidence: 5,
        shotType: "room",
        featureTags: [],
        scores: {
          lighting: 0.5,
          framing: 0.5,
          coverage: 0.5,
          clarity: 0.5,
          motionPotential: 0.5
        }
      })
    ).toThrow("Invalid confidence value");

    expect(() =>
      validateClassification({
        category: "kitchen",
        confidence: 0.5,
        shotType: "detail",
        featureTags: ["plant"],
        scores: {
          lighting: 2,
          framing: 0.5,
          coverage: 0.5,
          clarity: 0.5,
          motionPotential: 0.5,
          featureAppeal: 0.8
        }
      })
    ).toThrow("Invalid score value for lighting");
  });
});
