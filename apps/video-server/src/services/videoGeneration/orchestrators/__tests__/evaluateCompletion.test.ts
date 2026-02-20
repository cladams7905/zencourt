import { evaluateJobCompletionOrchestrator } from "@/services/videoGeneration/orchestrators/evaluateCompletion";

describe("evaluateJobCompletionOrchestrator", () => {
  it("returns not completed when no jobs exist", async () => {
    const result = await evaluateJobCompletionOrchestrator("video-1", {
      findJobsByVideoId: jest.fn().mockResolvedValue([]),
      markVideoFailed: jest.fn()
    });

    expect(result).toEqual({ allCompleted: false, completedJobs: [], failedJobs: 0 });
  });

  it("marks video failed when all jobs failed", async () => {
    const markVideoFailed = jest.fn();
    const result = await evaluateJobCompletionOrchestrator("video-1", {
      findJobsByVideoId: jest.fn().mockResolvedValue([
        { status: "failed" },
        { status: "failed" }
      ]),
      markVideoFailed
    });

    expect(result.allCompleted).toBe(false);
    expect(markVideoFailed).toHaveBeenCalledWith("video-1", "All video jobs failed");
  });
});
