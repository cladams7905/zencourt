import { createRunwayTaskSlots } from "@/services/videoGeneration/domain/runwayTaskSlots";

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

describe("runwayTaskSlots", () => {
  it("queues the fourth lease until one of the first three is released", async () => {
    const slots = createRunwayTaskSlots(3);

    const lease1 = await slots.acquire();
    const lease2 = await slots.acquire();
    const lease3 = await slots.acquire();

    let acquiredFourth = false;
    const fourthLeasePromise = slots.acquire().then((lease) => {
      acquiredFourth = true;
      return lease;
    });

    await flush();
    expect(acquiredFourth).toBe(false);

    lease2.release();
    const lease4 = await fourthLeasePromise;

    expect(acquiredFourth).toBe(true);

    lease1.release();
    lease3.release();
    lease4.release();
  });

  it("releases a bound task by task id", async () => {
    const slots = createRunwayTaskSlots(1);

    const lease1 = await slots.acquire();
    lease1.bind("task-1");

    let acquiredSecond = false;
    const secondLeasePromise = slots.acquire().then((lease) => {
      acquiredSecond = true;
      return lease;
    });

    await flush();
    expect(acquiredSecond).toBe(false);

    slots.releaseByTaskId("task-1");
    const lease2 = await secondLeasePromise;

    expect(acquiredSecond).toBe(true);

    lease2.release();
  });
});
