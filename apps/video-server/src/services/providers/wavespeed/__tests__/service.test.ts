const submitMock = jest.fn();
const getResultMock = jest.fn();
const fetchMock = jest.fn();

export {};

jest.mock("wavespeed", () => {
  return jest.fn().mockImplementation(() => ({
    _submit: (...args: unknown[]) => submitMock(...args),
    _getResult: (...args: unknown[]) => getResultMock(...args)
  }));
});

global.fetch = fetchMock as unknown as typeof fetch;

describe("WaveSpeed provider service", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    process.env.WAVESPEED_API_KEY = "wavespeed-key";
  });

  it("submits an async veo3.1-fast image-to-video request", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: "task-123" } })
    });

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

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.wavespeed.ai/api/v3/google/veo3.1-fast/image-to-video?webhook=https%3A%2F%2Fvideo.example.com%2Fwebhooks%2Fwavespeed%3FjobId%3Djob-1",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer wavespeed-key"
        }
      })
    );
    expect(
      JSON.parse((fetchMock.mock.calls[0]?.[1] as { body: string }).body)
    ).toEqual({
      image: "https://cdn/image.jpg",
      prompt: "Forward pan through the Kitchen.",
      negative_prompt:
        "No people. No added objects. Keep architecture and materials unchanged.",
      duration: 4,
      aspect_ratio: "16:9",
      resolution: "4k",
      generate_audio: false
    });
    expect(submitMock).not.toHaveBeenCalled();
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
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: { id: null } })
    });

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

  it("throws with response details when submit returns a non-2xx response", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => "bad request"
    });

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
    ).rejects.toThrow("WaveSpeed submit failed (400): bad request");
  });
});
