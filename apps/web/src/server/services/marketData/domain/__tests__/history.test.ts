import {
  computeYoYChange,
  extractHistoryMap,
  getLatestHistoryKey,
  getPriorYearKey,
  pickTimestamp
} from "../history";

describe("marketData/domain/history", () => {
  it("picks timestamp from sale data, then rental data, then now()", () => {
    const now = () => new Date("2026-02-18T12:00:00.000Z");
    expect(
      pickTimestamp(
        { lastUpdatedDate: "2026-01-01T00:00:00.000Z" },
        { lastUpdatedDate: "2026-02-01T00:00:00.000Z" },
        now
      )
    ).toBe("2026-01-01T00:00:00.000Z");
    expect(pickTimestamp({}, { lastUpdatedDate: "2026-02-01T00:00:00.000Z" }, now)).toBe(
      "2026-02-01T00:00:00.000Z"
    );
    expect(pickTimestamp({}, {}, now)).toBe("2026-02-18T12:00:00.000Z");
  });

  it("extracts history map and selects latest key", () => {
    const history = extractHistoryMap({
      history: {
        "2025-01": { median: 10 },
        "2026-01": { median: 12 }
      }
    });
    expect(history).toEqual({
      "2025-01": { median: 10 },
      "2026-01": { median: 12 }
    });
    expect(extractHistoryMap({ history: null })).toEqual({});

    expect(getLatestHistoryKey(history, "2026-01-20")).toBe("2026-01");
    expect(getLatestHistoryKey(history, "2026-02-20")).toBe("2026-01");
    expect(getLatestHistoryKey({}, "2026-02-20")).toBeNull();
  });

  it("derives prior-year key and computes year-over-year change", () => {
    const history = {
      "2025-01": { median: "100" },
      "2026-01": { median: 125 }
    };

    expect(getPriorYearKey("2026-01")).toBe("2025-01");
    expect(getPriorYearKey("bad")).toBeNull();
    expect(computeYoYChange(history, "2026-01", "median")).toBe(0.25);
    expect(
      computeYoYChange(
        { "2026-01": { median: 120 }, "2025-01": { median: 0 } },
        "2026-01",
        "median"
      )
    ).toBeNull();
  });
});
