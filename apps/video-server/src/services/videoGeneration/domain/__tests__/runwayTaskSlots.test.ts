import {
  RunwayTaskSlots,
  createRunwayTaskSlots,
  runwayTaskSlots
} from "@/services/videoGeneration/domain/runwayTaskSlots";

describe("runwayTaskSlots re-exports", () => {
  it("exposes the class, factory, and the shared singleton", () => {
    expect(new RunwayTaskSlots(2)).toBeInstanceOf(RunwayTaskSlots);
    const slots = createRunwayTaskSlots(2);
    expect(slots.acquire).toEqual(expect.any(Function));
    expect(runwayTaskSlots.acquire).toEqual(expect.any(Function));
  });
});
