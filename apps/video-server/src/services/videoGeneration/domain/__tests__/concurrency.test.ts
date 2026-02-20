import { runWithConcurrency } from "@/services/videoGeneration/domain/concurrency";

describe("runWithConcurrency", () => {
  it("processes all items", async () => {
    const items = [1, 2, 3, 4];
    const seen: number[] = [];

    await runWithConcurrency(items, 2, async (item) => {
      seen.push(item);
    });

    expect(seen.sort()).toEqual([1, 2, 3, 4]);
  });

  it("returns immediately for empty array", async () => {
    const handler = jest.fn();
    await runWithConcurrency([], 2, handler);
    expect(handler).not.toHaveBeenCalled();
  });

  it("handles fewer items than the concurrency limit", async () => {
    const seen: number[] = [];
    await runWithConcurrency([1], 10, async (item) => {
      seen.push(item);
    });
    expect(seen).toEqual([1]);
  });

  it("propagates handler errors", async () => {
    await expect(
      runWithConcurrency([1, 2], 2, async (item) => {
        if (item === 2) throw new Error("handler failed");
      })
    ).rejects.toThrow("handler failed");
  });
});
