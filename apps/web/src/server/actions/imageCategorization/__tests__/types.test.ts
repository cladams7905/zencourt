import { buildNoopStats } from "@web/src/server/actions/imageCategorization/types";

describe("imageCategorization types helpers", () => {
  it("builds noop stats with expected defaults", () => {
    expect(buildNoopStats(3, 1)).toEqual({
      total: 0,
      uploaded: 3,
      analyzed: 1,
      failed: 0,
      successRate: 100,
      avgConfidence: 0,
      totalDuration: 0
    });
  });
});
