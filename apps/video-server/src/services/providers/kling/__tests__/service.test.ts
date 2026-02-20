const submitMock = jest.fn();
const configMock = jest.fn();

jest.mock("@fal-ai/client", () => ({
  fal: {
    config: (...args: unknown[]) => configMock(...args),
    queue: {
      submit: (...args: unknown[]) => submitMock(...args)
    }
  }
}));

describe("kling provider service", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("submits kling request with expected payload", async () => {
    submitMock.mockResolvedValue({ request_id: "req-123" });
    const { klingService } = await import("@/services/providers/kling");

    const requestId = await klingService.submitRoomVideo({
      prompt: "Make this cinematic",
      imageUrls: [
        "https://cdn/1.jpg",
        "https://cdn/2.jpg",
        "https://cdn/3.jpg",
        "https://cdn/4.jpg",
        "https://cdn/5.jpg"
      ],
      duration: "10",
      aspectRatio: "9:16",
      webhookUrl: "https://webhook.local"
    });

    expect(requestId).toBe("req-123");
    expect(submitMock).toHaveBeenCalledTimes(1);
    expect(submitMock).toHaveBeenCalledWith(
      "fal-ai/kling-video/v1.6/standard/elements",
      {
        input: {
          prompt: "Make this cinematic",
          input_image_urls: [
            "https://cdn/1.jpg",
            "https://cdn/2.jpg",
            "https://cdn/3.jpg",
            "https://cdn/4.jpg"
          ],
          duration: "10",
          aspect_ratio: "9:16"
        },
        webhookUrl: "https://webhook.local"
      }
    );
  });

  it("rejects missing prompt", async () => {
    const { klingService } = await import("@/services/providers/kling");
    await expect(
      klingService.submitRoomVideo({
        prompt: "",
        imageUrls: ["https://cdn/1.jpg"]
      })
    ).rejects.toThrow("Prompt is required for Kling job submission");
  });

  it("rejects missing images", async () => {
    const { klingService } = await import("@/services/providers/kling");
    await expect(
      klingService.submitRoomVideo({
        prompt: "ok",
        imageUrls: []
      })
    ).rejects.toThrow("At least one image URL is required for Kling job");
  });

  it("uses default duration and aspect ratio when not specified", async () => {
    submitMock.mockResolvedValue({ request_id: "req-defaults" });
    const { klingService } = await import("@/services/providers/kling");

    await klingService.submitRoomVideo({
      prompt: "test",
      imageUrls: ["https://cdn/1.jpg"]
    });

    expect(submitMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        input: expect.objectContaining({
          duration: "5",
          aspect_ratio: "16:9"
        })
      })
    );
  });

  it("falls back to FAL_WEBHOOK_URL env var when webhookUrl not provided", async () => {
    process.env.FAL_WEBHOOK_URL = "https://fallback.webhook";
    submitMock.mockResolvedValue({ request_id: "req-env" });
    const { klingService } = await import("@/services/providers/kling");

    await klingService.submitRoomVideo({
      prompt: "test",
      imageUrls: ["https://cdn/1.jpg"]
    });

    expect(submitMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ webhookUrl: "https://fallback.webhook" })
    );
    delete process.env.FAL_WEBHOOK_URL;
  });

  it("rethrows fal submission errors", async () => {
    submitMock.mockRejectedValue(new Error("fal API down"));
    const { klingService } = await import("@/services/providers/kling");

    await expect(
      klingService.submitRoomVideo({
        prompt: "test",
        imageUrls: ["https://cdn/1.jpg"],
        webhookUrl: "https://webhook.local"
      })
    ).rejects.toThrow("fal API down");
  });
});
