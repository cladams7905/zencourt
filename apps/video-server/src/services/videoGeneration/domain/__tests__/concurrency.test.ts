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
});
