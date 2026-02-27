import { selectRotatedHeaderHook } from "../hookRotation";
import { createInMemoryTemplateHeaderRotationStore } from "../../../../rotation";

describe("templateRender/policies/hookRotation", () => {
  it("rotates hooks in memory when a rotationKey is provided", async () => {
    const hooks = [
      { header: "A", subheader: "" },
      { header: "B", subheader: "" }
    ];
    const rotationStore = createInMemoryTemplateHeaderRotationStore();

    const first = await selectRotatedHeaderHook({
      hooks,
      rotationKey: "rotation-test-key",
      rotationStore
    });
    const second = await selectRotatedHeaderHook({
      hooks,
      rotationKey: "rotation-test-key",
      rotationStore
    });

    expect(first?.header).toBe("A");
    expect(second?.header).toBe("B");
  });
});
