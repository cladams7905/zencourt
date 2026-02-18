import {
  REFERRAL_OPTIONS,
  WELCOME_SURVEY_STEP_COUNT
} from "@web/src/components/welcome/shared/constants";

describe("welcome shared constants", () => {
  it("defines expected step count", () => {
    expect(WELCOME_SURVEY_STEP_COUNT).toBe(5);
  });

  it("contains referral options with unique values", () => {
    expect(REFERRAL_OPTIONS).toHaveLength(9);
    expect(REFERRAL_OPTIONS[0]).toEqual({
      value: "facebook",
      label: "Facebook"
    });
    expect(REFERRAL_OPTIONS[REFERRAL_OPTIONS.length - 1]).toEqual({
      value: "other",
      label: "Other"
    });

    const unique = new Set(REFERRAL_OPTIONS.map((option) => option.value));
    expect(unique.size).toBe(REFERRAL_OPTIONS.length);
  });
});
