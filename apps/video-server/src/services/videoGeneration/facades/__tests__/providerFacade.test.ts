import { ProviderDispatchFacade } from "@/services/videoGeneration/facades/providerFacade";

describe("ProviderDispatchFacade", () => {
  const input = {
    jobId: "job-1",
    videoId: "video-1",
    prompt: "prompt",
    imageUrls: ["https://image.jpg"],
    orientation: "vertical" as const,
    durationSeconds: 4,
    webhookUrl: "https://webhook"
  };

  it("uses first successful strategy", async () => {
    const facade = new ProviderDispatchFacade([
      {
        name: "one",
        canHandle: () => true,
        dispatch: jest.fn().mockResolvedValue({
          provider: "one",
          model: "m1",
          requestId: "r1"
        })
      },
      {
        name: "two",
        canHandle: () => true,
        dispatch: jest.fn()
      }
    ]);

    const result = await facade.dispatch(input);
    expect(result.requestId).toBe("r1");
  });

  it("falls back to next strategy when first fails", async () => {
    const facade = new ProviderDispatchFacade([
      {
        name: "one",
        canHandle: () => true,
        dispatch: jest.fn().mockRejectedValue(new Error("first failed"))
      },
      {
        name: "two",
        canHandle: () => true,
        dispatch: jest.fn().mockResolvedValue({
          provider: "two",
          model: "m2",
          requestId: "r2"
        })
      }
    ]);

    const result = await facade.dispatch(input);
    expect(result.requestId).toBe("r2");
  });

  it("retries a failing strategy before succeeding", async () => {
    const dispatch = jest
      .fn()
      .mockRejectedValueOnce(new Error("temp fail"))
      .mockResolvedValueOnce({
        provider: "one",
        model: "veo3.1_fast",
        requestId: "r3"
      });
    const facade = new ProviderDispatchFacade([
      {
        name: "one",
        canHandle: () => true,
        dispatch
      }
    ]);

    const result = await facade.dispatch(input);
    expect(result.requestId).toBe("r3");
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
});
