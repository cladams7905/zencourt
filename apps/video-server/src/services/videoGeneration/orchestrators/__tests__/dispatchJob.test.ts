import { dispatchJobOrchestrator } from "@/services/videoGeneration/orchestrators/dispatchJob";

describe("dispatchJobOrchestrator", () => {
  const baseJob = {
    id: "job-1",
    videoGenBatchId: "video-1",
    metadata: { duration: 4 },
    generationSettings: {
      prompt: "prompt",
      imageUrls: ["https://image.jpg"],
      orientation: "vertical"
    }
  } as never;

  it("falls back when primary dispatch fails", async () => {
    const primaryProviderFacade: any = {
      dispatch: jest.fn().mockRejectedValue(new Error("primary failed"))
    };
    const fallbackProviderFacade: any = {
      dispatch: jest.fn().mockResolvedValue({
        provider: "fallback",
        model: "veo3.1_fast",
        requestId: "req-1"
      })
    };

    const markJobProcessing = jest.fn().mockResolvedValue(undefined);
    await dispatchJobOrchestrator(baseJob, {
      primaryProviderFacade,
      fallbackProviderFacade,
      markJobProcessing,
      onProviderOutputReady: jest.fn(),
      onProviderOutputFailure: jest.fn().mockResolvedValue(undefined),
      buildWebhookUrl: () => "https://webhook?requestId=job-1",
      getJobDurationSeconds: () => 4
    });

    expect(primaryProviderFacade.dispatch).toHaveBeenCalledTimes(1);
    expect(fallbackProviderFacade.dispatch).toHaveBeenCalledTimes(1);
    expect(markJobProcessing).toHaveBeenCalledWith(
      "job-1",
      "req-1",
      expect.objectContaining({ model: expect.any(String) })
    );
  });
});
