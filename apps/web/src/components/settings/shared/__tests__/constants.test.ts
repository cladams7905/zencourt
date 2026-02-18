import {
  coerceToneValue,
  SETTINGS_HASH_TO_TAB,
  SUBSCRIPTION_PLAN_LABELS,
  TONE_SCALE
} from "@web/src/components/settings/shared/constants";

describe("settings constants", () => {
  it("coerces null, empty, and invalid values to conversational default", () => {
    expect(coerceToneValue(null)).toBe(3);
    expect(coerceToneValue("" as never)).toBe(3);
    expect(coerceToneValue("invalid" as never)).toBe(3);
    expect(coerceToneValue(9 as never)).toBe(3);
  });

  it("coerces valid numeric and numeric-string values", () => {
    expect(coerceToneValue(1)).toBe(1);
    expect(coerceToneValue("4" as never)).toBe(4);
  });

  it("contains expected tab hash mappings", () => {
    expect(SETTINGS_HASH_TO_TAB["#profile"]).toBe("branding");
    expect(SETTINGS_HASH_TO_TAB["#subscription"]).toBe("subscription");
  });

  it("contains expected plan labels and complete tone scale", () => {
    expect(SUBSCRIPTION_PLAN_LABELS.growth.label).toBe("Growth");
    expect(TONE_SCALE).toHaveLength(5);
  });
});
