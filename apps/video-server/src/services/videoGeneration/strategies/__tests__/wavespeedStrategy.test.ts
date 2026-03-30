const submitImageToVideo = jest.fn();

export {};

jest.mock("@/services/providers/wavespeed", () => ({
  waveSpeedService: {
    submitImageToVideo: (...args: unknown[]) => submitImageToVideo(...args)
  }
}));

describe("wavespeedStrategy", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("handles veo3.1_fast jobs and maps native negative prompt fields", async () => {
    submitImageToVideo.mockResolvedValue({
      id: "task-1",
      status: "pending"
    });

    const { wavespeedStrategy } = await import(
      "@/services/videoGeneration/strategies/wavespeedStrategy"
    );
    const result = await wavespeedStrategy.dispatch({
      jobId: "job-1",
      videoId: "batch-1",
      prompt: "prompt",
      negativePrompt: "negative prompt",
      imageUrls: ["https://image.jpg"],
      orientation: "landscape",
      durationSeconds: 4,
      webhookUrl: "https://webhook",
      model: "veo3.1_fast"
    });

    expect(submitImageToVideo).toHaveBeenCalledWith({
      image: "https://image.jpg",
      prompt: "prompt",
      negativePrompt: "negative prompt",
      duration: 4,
      aspectRatio: "16:9",
      resolution: "4k",
      webhookUrl: "https://webhook"
    });
    expect(result).toEqual({
      provider: "wavespeed",
      model: "veo3.1_fast",
      requestId: "task-1"
    });
  });

  it("is the first primary strategy and only handles veo jobs", async () => {
    const { primaryProviderStrategies } = await import(
      "@/services/videoGeneration/strategies"
    );
    const { wavespeedStrategy } = await import(
      "@/services/videoGeneration/strategies/wavespeedStrategy"
    );

    expect(primaryProviderStrategies[0]?.name).toBe("wavespeed");
    expect(
      wavespeedStrategy.canHandle({
        model: "veo3.1_fast"
      } as never)
    ).toBe(true);
    expect(
      wavespeedStrategy.canHandle({
        model: "gen4.5"
      } as never)
    ).toBe(false);
  });
});
