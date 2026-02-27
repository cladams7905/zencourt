import { applyGarageLabelPolicy } from "../garageLabel";

describe("templateRender/policies/garageLabel", () => {
  it("sets garageLabel to the default label when garageCount is greater than 0", () => {
    const result = applyGarageLabelPolicy({
      resolvedParameters: {
        headerText: "A Header",
        garageCount: "2"
      }
    });

    expect(result.garageLabel).toBe("Car Garage");
  });

  it("sets garageLabel to empty when garageCount is empty or zero", () => {
    const empty = applyGarageLabelPolicy({
      resolvedParameters: {
        garageCount: ""
      }
    });
    const zero = applyGarageLabelPolicy({
      resolvedParameters: {
        garageCount: "0"
      }
    });

    expect(empty.garageLabel).toBe("");
    expect(zero.garageLabel).toBe("");
  });
});
