import {
  getUtcMonthKey,
  slugify,
  buildServiceAreasSignature,
  getSecondsUntilEndOfMonth
} from "@web/src/server/services/community/shared/common";

describe("community shared common", () => {
  it("gets utc month key and falls back for out-of-range month", () => {
    expect(getUtcMonthKey(new Date("2026-02-15T00:00:00Z"))).toBe("february");
    expect(getUtcMonthKey({ getUTCMonth: () => 99 } as never)).toBe("january");
  });

  it("slugifies and builds service area signatures", () => {
    expect(slugify("  San Antonio, TX ")).toBe("san-antonio-tx");
    expect(buildServiceAreasSignature(null)).toBeNull();
    expect(buildServiceAreasSignature(["", "   "])).toBeNull();

    const sig = buildServiceAreasSignature(["Austin, TX", "Dallas, TX"]);
    expect(sig).toHaveLength(12);
  });

  it("calculates seconds until end of month with minimum floor", () => {
    expect(getSecondsUntilEndOfMonth(new Date("2026-02-28T23:59:30Z"))).toBeGreaterThanOrEqual(60);
  });
});
