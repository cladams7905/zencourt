import {
  cloneDefaultGeneratedState,
  parseGeneratedContentSession,
  serializeGeneratedContentSession
} from "@web/src/components/dashboard/domain/dashboardSessionUtils";

describe("dashboardSessionUtils", () => {
  it("returns null for invalid session payload", () => {
    expect(parseGeneratedContentSession("not-json")).toBeNull();
  });

  it("returns null for expired payload", () => {
    const state = cloneDefaultGeneratedState();
    const payload = JSON.stringify({
      expiresAt: 10,
      data: state
    });

    expect(parseGeneratedContentSession(payload, 20)).toBeNull();
  });

  it("normalizes streamed ids out of restored state", () => {
    const state = cloneDefaultGeneratedState();
    state.videos.market_insights = [
      { id: "stream-1", hook: "temp" },
      { id: "generated-1", hook: "kept" }
    ];

    const payload = JSON.stringify({
      expiresAt: 100,
      data: state
    });

    const parsed = parseGeneratedContentSession(payload, 50);

    expect(parsed?.videos.market_insights).toEqual([
      { id: "generated-1", hook: "kept" }
    ]);
  });

  it("serializes with ttl", () => {
    const state = cloneDefaultGeneratedState();
    const serialized = serializeGeneratedContentSession(state, 1_000);
    const parsed = JSON.parse(serialized) as { expiresAt: number };

    expect(parsed.expiresAt).toBeGreaterThan(1_000);
  });
});
