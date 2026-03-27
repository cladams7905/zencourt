import {
  DEFAULT_RUNWAY_MODEL,
  isRunwayGenerationModel,
  resolveRunwayGenerationModel,
  toRunwayApiModel
} from "@/services/videoGeneration/domain/runwayModels";

describe("runwayModels", () => {
  it("recognizes supported models", () => {
    expect(isRunwayGenerationModel("gen4.5")).toBe(true);
    expect(isRunwayGenerationModel("veo3.1_fast")).toBe(true);
    expect(isRunwayGenerationModel("runway-gen4-turbo")).toBe(true);
  });

  it("rejects unknown or empty models", () => {
    expect(isRunwayGenerationModel("kling1.6")).toBe(false);
    expect(isRunwayGenerationModel(null)).toBe(false);
    expect(isRunwayGenerationModel(undefined)).toBe(false);
  });

  it("resolves unsupported values to the default model", () => {
    expect(resolveRunwayGenerationModel("kling1.6")).toBe(DEFAULT_RUNWAY_MODEL);
    expect(resolveRunwayGenerationModel(null)).toBe(DEFAULT_RUNWAY_MODEL);
  });

  it("keeps supported models unchanged", () => {
    expect(resolveRunwayGenerationModel("gen4.5")).toBe("gen4.5");
  });

  it("maps turbo model to the runway SDK value", () => {
    expect(toRunwayApiModel("runway-gen4-turbo")).toBe("gen4_turbo");
    expect(toRunwayApiModel("veo3.1_fast")).toBe("veo3.1_fast");
    expect(toRunwayApiModel("gen4.5")).toBe("gen4.5");
  });
});
