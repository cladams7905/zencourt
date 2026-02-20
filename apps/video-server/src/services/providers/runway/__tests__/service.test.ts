const createMock = jest.fn();
const waitForTaskOutputMock = jest.fn();

jest.mock("@runwayml/sdk", () => {
  return jest.fn().mockImplementation(() => ({
    imageToVideo: {
      create: (...args: unknown[]) => createMock(...args)
    }
  }));
});

describe("runway provider service", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.RUNWAY_API_KEY = "runway-key";
  });

  it("submits request and maps waitForTaskOutput result", async () => {
    type RunwayTaskPromise = Promise<{ id: string }> & {
      waitForTaskOutput: () => Promise<{ output: string[] }>;
    };
    const taskPromiseLike = Promise.resolve({
      id: "task-123"
    }) as unknown as RunwayTaskPromise;
    taskPromiseLike.waitForTaskOutput = waitForTaskOutputMock;
    waitForTaskOutputMock.mockResolvedValue({
      output: ["https://cdn/video.mp4"]
    });
    createMock.mockReturnValue(taskPromiseLike);

    const { runwayService } = await import("@/services/providers/runway");
    const result = await runwayService.submitImageToVideo({
      promptImage: "https://cdn/image.jpg",
      promptText: "Prompt text",
      ratio: "720:1280",
      duration: 4
    });

    expect(result.id).toBe("task-123");
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "veo3.1_fast",
        promptImage: [{ uri: "https://cdn/image.jpg", position: "first" }],
        ratio: "720:1280",
        duration: 4
      })
    );

    const output = await result.waitForTaskOutput();
    expect(output).toEqual({
      output: [{ uri: "https://cdn/video.mp4" }]
    });
  });

  it("throws when runway response has no task id", async () => {
    type RunwayTaskPromise = Promise<{ id: string }> & {
      waitForTaskOutput: () => Promise<{ output: string[] }>;
    };
    const taskPromiseLike = Promise.resolve({
      id: ""
    }) as unknown as RunwayTaskPromise;
    taskPromiseLike.waitForTaskOutput = waitForTaskOutputMock;
    createMock.mockReturnValue(taskPromiseLike);

    const { runwayService } = await import("@/services/providers/runway");
    await expect(
      runwayService.submitImageToVideo({
        promptImage: "https://cdn/image.jpg",
        promptText: "Prompt text",
        ratio: "1280:720",
        duration: 4
      })
    ).rejects.toThrow("Runway response missing task id");
  });
});
