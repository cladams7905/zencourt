const submitMock = jest.fn();
const getResultMock = jest.fn();

export {};

jest.mock("wavespeed", () => {
  return jest.fn().mockImplementation(() => ({
    _submit: (...args: unknown[]) => submitMock(...args),
    _getResult: (...args: unknown[]) => getResultMock(...args)
  }));
});

describe("WaveSpeed provider service", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.WAVESPEED_API_KEY = "wavespeed-key";
  });

  it("submits an async veo3.1-fast image-to-video request", async () => {
    submitMock.mockResolvedValue(["task-123", null]);

    const { waveSpeedService } = await import("@/services/providers/wavespeed");
    const result = await waveSpeedService.submitImageToVideo({
      image: "https://cdn/image.jpg",
      prompt: "Forward pan through the Kitchen.",
      negativePrompt:
        "No people. No added objects. Keep architecture and materials unchanged.",
      duration: 4,
      aspectRatio: "16:9",
      resolution: "4k",
      webhookUrl: "https://video.example.com/webhooks/wavespeed?jobId=job-1"
    });

    expect(submitMock).toHaveBeenCalledWith(
      "google/veo3.1-fast/image-to-video",
      {
        image: "https://cdn/image.jpg",
        prompt: "Forward pan through the Kitchen.",
        negative_prompt:
          "No people. No added objects. Keep architecture and materials unchanged.",
        duration: 4,
        aspect_ratio: "16:9",
        resolution: "4k",
        generate_audio: false,
        webhook_url: "https://video.example.com/webhooks/wavespeed?jobId=job-1"
      },
      false
    );
    expect(result).toEqual({
      id: "task-123",
      status: "pending"
    });
  });

  it("retrieves and normalizes task results", async () => {
    getResultMock.mockResolvedValue({
      data: {
        id: "task-123",
        status: "completed",
        outputs: ["https://cdn/video.mp4"]
      }
    });

    const { waveSpeedService } = await import("@/services/providers/wavespeed");
    const result = await waveSpeedService.retrieveTask("task-123");

    expect(getResultMock).toHaveBeenCalledWith("task-123");
    expect(result).toEqual({
      id: "task-123",
      status: "completed",
      outputs: ["https://cdn/video.mp4"],
      error: null
    });
  });

  it("throws when the submit response is missing a task id", async () => {
    submitMock.mockResolvedValue([null, null]);

    const { waveSpeedService } = await import("@/services/providers/wavespeed");

    await expect(
      waveSpeedService.submitImageToVideo({
        image: "https://cdn/image.jpg",
        prompt: "Forward pan through the Kitchen.",
        negativePrompt: "No people.",
        duration: 4,
        aspectRatio: "16:9",
        resolution: "4k",
        webhookUrl: "https://video.example.com/webhooks/wavespeed?jobId=job-1"
      })
    ).rejects.toThrow("WaveSpeed response missing task id");
  });
});
