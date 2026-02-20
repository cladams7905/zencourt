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

  it("returns allCompleted true when all jobs completed", async () => {
    const result = await evaluateJobCompletionOrchestrator("video-1", {
      findJobsByVideoId: jest.fn().mockResolvedValue([
        { status: "completed", videoUrl: "https://cdn/a.mp4", createdAt: new Date() },
        { status: "completed", videoUrl: "https://cdn/b.mp4", createdAt: new Date() }
      ]),
      markVideoFailed: jest.fn()
    });

    expect(result.allCompleted).toBe(true);
    expect(result.completedJobs).toHaveLength(2);
    expect(result.failedJobs).toBe(0);
  });

  it("returns allCompleted false when some jobs still pending", async () => {
    const markVideoFailed = jest.fn();
    const result = await evaluateJobCompletionOrchestrator("video-1", {
      findJobsByVideoId: jest.fn().mockResolvedValue([
        { status: "completed", videoUrl: "https://cdn/a.mp4", createdAt: new Date() },
        { status: "processing" }
      ]),
      markVideoFailed
    });

    expect(result.allCompleted).toBe(false);
    expect(markVideoFailed).not.toHaveBeenCalled();
  });

  it("returns allCompleted true with mixed completed and failed when at least one completed", async () => {
    const markVideoFailed = jest.fn();
    const result = await evaluateJobCompletionOrchestrator("video-1", {
      findJobsByVideoId: jest.fn().mockResolvedValue([
        { status: "completed", videoUrl: "https://cdn/a.mp4", createdAt: new Date() },
        { status: "failed" }
      ]),
      markVideoFailed
    });

    expect(result.allCompleted).toBe(true);
    expect(result.failedJobs).toBe(1);
    expect(markVideoFailed).not.toHaveBeenCalled();
  });
});
