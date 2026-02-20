import { videoGenerationService } from "@/services/videoGeneration";
import { startGenerationOrchestrator } from "@/services/videoGeneration/orchestrators/startGeneration";
import { handleFalWebhookOrchestrator } from "@/services/videoGeneration/orchestrators/handleFalWebhook";

jest.mock("@/services/videoGeneration/orchestrators/startGeneration", () => ({
  startGenerationOrchestrator: jest.fn()
}));

jest.mock("@/services/videoGeneration/orchestrators/handleFalWebhook", () => ({
  handleFalWebhookOrchestrator: jest.fn()
}));

describe("videoGeneration service wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("delegates startGeneration to orchestrator", async () => {
    (startGenerationOrchestrator as jest.Mock).mockResolvedValue({
      jobsStarted: 1,
      failedJobs: []
    });

    const result = await videoGenerationService.startGeneration({
      videoId: "video-1",
      listingId: "listing-1",
      userId: "user-1",
      jobIds: ["job-1"],
      callbackUrl: "https://example.vercel.app/api/v1/webhooks/video"
    });

    expect(result).toEqual({ jobsStarted: 1, failedJobs: [] });
    expect(startGenerationOrchestrator).toHaveBeenCalledTimes(1);
  });

  it("delegates handleFalWebhook to orchestrator", async () => {
    (handleFalWebhookOrchestrator as jest.Mock).mockResolvedValue(undefined);

    await videoGenerationService.handleFalWebhook(
      { request_id: "req-1", status: "COMPLETED" } as never,
      "job-1"
    );

    expect(handleFalWebhookOrchestrator).toHaveBeenCalledTimes(1);
  });
});
