import { dispatchJobOrchestrator } from "@/services/videoGeneration/orchestrators/dispatchJob";

function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

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

  it("succeeds via primary without calling fallback", async () => {
    const primaryProviderFacade: any = {
      dispatch: jest.fn().mockResolvedValue({
        provider: "primary",
        model: "veo3.1_fast",
        requestId: "req-primary"
      })
    };
    const fallbackProviderFacade: any = { dispatch: jest.fn() };
    const markJobProcessing = jest.fn().mockResolvedValue(undefined);

    await dispatchJobOrchestrator(baseJob, {
      primaryProviderFacade,
      fallbackProviderFacade,
      markJobProcessing,
      onProviderOutputReady: jest.fn(),
      onProviderOutputFailure: jest.fn(),
      buildWebhookUrl: () => "https://webhook",
      getJobDurationSeconds: () => 4
    });

    expect(primaryProviderFacade.dispatch).toHaveBeenCalledTimes(1);
    expect(fallbackProviderFacade.dispatch).not.toHaveBeenCalled();
    expect(markJobProcessing).toHaveBeenCalledWith(
      "job-1",
      "req-primary",
      expect.any(Object)
    );
  });

  it("throws when both primary and fallback fail", async () => {
    const primaryProviderFacade: any = {
      dispatch: jest.fn().mockRejectedValue(new Error("primary failed"))
    };
    const fallbackProviderFacade: any = {
      dispatch: jest.fn().mockRejectedValue(new Error("fallback failed"))
    };

    await expect(
      dispatchJobOrchestrator(baseJob, {
        primaryProviderFacade,
        fallbackProviderFacade,
        markJobProcessing: jest.fn(),
        onProviderOutputReady: jest.fn(),
        onProviderOutputFailure: jest.fn(),
        buildWebhookUrl: () => "https://webhook",
        getJobDurationSeconds: () => 4
      })
    ).rejects.toThrow("fallback failed");
  });

  it("throws when job is missing imageUrls", async () => {
    const jobWithoutImages = {
      ...baseJob,
      generationSettings: {
        prompt: "prompt",
        imageUrls: [],
        orientation: "vertical"
      }
    } as never;

    await expect(
      dispatchJobOrchestrator(jobWithoutImages, {
        primaryProviderFacade: { dispatch: jest.fn() } as any,
        fallbackProviderFacade: { dispatch: jest.fn() } as any,
        markJobProcessing: jest.fn(),
        onProviderOutputReady: jest.fn(),
        onProviderOutputFailure: jest.fn(),
        buildWebhookUrl: () => "https://webhook",
        getJobDurationSeconds: () => 4
      })
    ).rejects.toThrow("missing imageUrls");
  });

  it("throws when job is missing generationSettings", async () => {
    const jobWithoutSettings = {
      ...baseJob,
      generationSettings: null
    } as never;

    await expect(
      dispatchJobOrchestrator(jobWithoutSettings, {
        primaryProviderFacade: { dispatch: jest.fn() } as any,
        fallbackProviderFacade: { dispatch: jest.fn() } as any,
        markJobProcessing: jest.fn(),
        onProviderOutputReady: jest.fn(),
        onProviderOutputFailure: jest.fn(),
        buildWebhookUrl: () => "https://webhook",
        getJobDurationSeconds: () => 4
      })
    ).rejects.toThrow("missing generationSettings");
  });

  it("throws when job is missing prompt", async () => {
    const jobWithoutPrompt = {
      ...baseJob,
      generationSettings: {
        prompt: "",
        imageUrls: ["https://image.jpg"],
        orientation: "vertical"
      }
    } as never;

    await expect(
      dispatchJobOrchestrator(jobWithoutPrompt, {
        primaryProviderFacade: { dispatch: jest.fn() } as any,
        fallbackProviderFacade: { dispatch: jest.fn() } as any,
        markJobProcessing: jest.fn(),
        onProviderOutputReady: jest.fn(),
        onProviderOutputFailure: jest.fn(),
        buildWebhookUrl: () => "https://webhook",
        getJobDurationSeconds: () => 4
      })
    ).rejects.toThrow("missing prompt");
  });

  it("calls onProviderOutputReady when waitForOutput resolves", async () => {
    const onProviderOutputReady = jest.fn().mockResolvedValue(undefined);
    const primaryProviderFacade: any = {
      dispatch: jest.fn().mockResolvedValue({
        provider: "primary",
        model: "veo3.1_fast",
        requestId: "req-1",
        waitForOutput: () =>
          Promise.resolve({ outputUrl: "https://cdn/output.mp4" })
      })
    };

    await dispatchJobOrchestrator(baseJob, {
      primaryProviderFacade,
      fallbackProviderFacade: { dispatch: jest.fn() } as any,
      markJobProcessing: jest.fn().mockResolvedValue(undefined),
      onProviderOutputReady,
      onProviderOutputFailure: jest.fn(),
      buildWebhookUrl: () => "https://webhook",
      getJobDurationSeconds: () => 4
    });

    await tick();
    await tick();

    expect(onProviderOutputReady).toHaveBeenCalledWith(
      baseJob,
      "https://cdn/output.mp4",
      expect.objectContaining({ durationSeconds: 4, thumbnailUrl: null })
    );
  });

  it("calls onProviderOutputFailure when waitForOutput rejects", async () => {
    const onProviderOutputFailure = jest.fn().mockResolvedValue(undefined);
    const primaryProviderFacade: any = {
      dispatch: jest.fn().mockResolvedValue({
        provider: "primary",
        model: "veo3.1_fast",
        requestId: "req-1",
        waitForOutput: () => Promise.reject(new Error("provider task failed"))
      })
    };

    await dispatchJobOrchestrator(baseJob, {
      primaryProviderFacade,
      fallbackProviderFacade: { dispatch: jest.fn() } as any,
      markJobProcessing: jest.fn().mockResolvedValue(undefined),
      onProviderOutputReady: jest.fn(),
      onProviderOutputFailure,
      buildWebhookUrl: () => "https://webhook",
      getJobDurationSeconds: () => 4
    });

    await tick();
    await tick();

    expect(onProviderOutputFailure).toHaveBeenCalledWith(
      "job-1",
      "provider task failed"
    );
  });

  it("logs when onProviderOutputFailure rejects", async () => {
    const onProviderOutputFailure = jest
      .fn()
      .mockRejectedValue(new Error("handler failed"));
    const primaryProviderFacade: any = {
      dispatch: jest.fn().mockResolvedValue({
        provider: "primary",
        model: "veo3.1_fast",
        requestId: "req-1",
        waitForOutput: () => Promise.reject(new Error("provider task failed"))
      })
    };

    await dispatchJobOrchestrator(baseJob, {
      primaryProviderFacade,
      fallbackProviderFacade: { dispatch: jest.fn() } as any,
      markJobProcessing: jest.fn().mockResolvedValue(undefined),
      onProviderOutputReady: jest.fn(),
      onProviderOutputFailure,
      buildWebhookUrl: () => "https://webhook",
      getJobDurationSeconds: () => 4
    });

    await tick();
    await tick();

    expect(onProviderOutputFailure).toHaveBeenCalledWith(
      "job-1",
      "provider task failed"
    );
  });
});
