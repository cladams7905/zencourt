const submitImageToVideo = jest.fn();

jest.mock("@/services/providers/runway", () => ({
  runwayService: {
    submitImageToVideo: (...args: unknown[]) => submitImageToVideo(...args)
  }
}));

describe("runwayStrategy", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.RUNWAY_MAX_ACTIVE_TASKS = "3";
  });

  it("limits active runway tasks to three until one finishes", async () => {
    const waits: Array<() => void> = [];
    let taskCounter = 0;

    submitImageToVideo.mockImplementation(() => {
      taskCounter += 1;
      const id = `task-${taskCounter}`;
      return Promise.resolve({
        id,
        waitForTaskOutput: () =>
          new Promise<{ output: Array<{ uri?: string }> }>((resolve) => {
            waits.push(() => resolve({ output: [{ uri: `https://cdn/${id}.mp4` }] }));
          })
      });
    });

    const { runwayStrategy } = await import("@/services/videoGeneration/strategies/runwayStrategy");
    const input = {
      jobId: "job",
      videoId: "batch-1",
      prompt: "prompt",
      imageUrls: ["https://image.jpg"],
      orientation: "vertical" as const,
      durationSeconds: 4,
      webhookUrl: "https://webhook"
    };

    const first = await runwayStrategy.dispatch({ ...input, jobId: "job-1" });
    const second = await runwayStrategy.dispatch({ ...input, jobId: "job-2" });
    const third = await runwayStrategy.dispatch({ ...input, jobId: "job-3" });

    let fourthResolved = false;
    const fourthPromise = runwayStrategy
      .dispatch({ ...input, jobId: "job-4" })
      .then((value) => {
        fourthResolved = true;
        return value;
      });

    await new Promise((resolve) => setImmediate(resolve));
    expect(fourthResolved).toBe(false);
    expect(submitImageToVideo).toHaveBeenCalledTimes(3);

    const firstWait = first.waitForOutput?.();
    waits[0]();
    await firstWait;
    const fourth = await fourthPromise;

    expect(submitImageToVideo).toHaveBeenCalledTimes(4);
    expect(fourth.requestId).toBe("task-4");

    const secondWait = second.waitForOutput?.();
    const thirdWait = third.waitForOutput?.();
    const fourthWait = fourth.waitForOutput?.();
    waits[1]();
    waits[2]();
    waits[3]();
    await secondWait;
    await thirdWait;
    await fourthWait;
  });

  it("defaults runway dispatches to gen4.5", async () => {
    submitImageToVideo.mockResolvedValue({
      id: "task-1",
      waitForTaskOutput: () =>
        Promise.resolve({ output: [{ uri: "https://cdn/task-1.mp4" }] })
    });

    const { runwayStrategy } = await import("@/services/videoGeneration/strategies/runwayStrategy");
    const result = await runwayStrategy.dispatch({
      jobId: "job-1",
      videoId: "batch-1",
      prompt: "prompt",
      imageUrls: ["https://image.jpg"],
      orientation: "vertical",
      durationSeconds: 4,
      webhookUrl: "https://webhook"
    });

    expect(submitImageToVideo).toHaveBeenCalledWith(
      expect.objectContaining({ model: "gen4.5" })
    );
    expect(result.model).toBe("gen4.5");
  });

  it("uses an explicit legacy runway model when provided", async () => {
    submitImageToVideo.mockResolvedValue({
      id: "task-legacy",
      waitForTaskOutput: () =>
        Promise.resolve({ output: [{ uri: "https://cdn/task-legacy.mp4" }] })
    });

    const { runwayStrategy } = await import("@/services/videoGeneration/strategies/runwayStrategy");
    const result = await runwayStrategy.dispatch({
      jobId: "job-legacy",
      videoId: "batch-1",
      prompt: "prompt",
      imageUrls: ["https://image.jpg"],
      orientation: "vertical",
      durationSeconds: 4,
      webhookUrl: "https://webhook",
      model: "veo3.1_fast"
    } as never);

    expect(submitImageToVideo).toHaveBeenCalledWith(
      expect.objectContaining({ model: "veo3.1_fast" })
    );
    expect(result.model).toBe("veo3.1_fast");
  });
});
