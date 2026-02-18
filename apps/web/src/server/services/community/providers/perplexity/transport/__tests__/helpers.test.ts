import { getWhySuitableFieldKey } from "@web/src/server/services/community/providers/perplexity/transport/helpers";

describe("getWhySuitableFieldKey", () => {
  it("returns audience-specific key", () => {
    expect(getWhySuitableFieldKey("growing_families")).toBe(
      "why_suitable_for_growing_families"
    );
  });

  it("returns default key when audience missing", () => {
    expect(getWhySuitableFieldKey()).toBe("why_suitable_for_audience");
  });
});
