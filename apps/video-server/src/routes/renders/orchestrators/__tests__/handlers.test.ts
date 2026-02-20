import {
  handleCancelRenderJob,
  handleCreateRender,
  handleGetRenderJob
} from "@/routes/renders/orchestrators/handlers";

describe("renders orchestrators", () => {
  it("creates render job when context and completed jobs exist", async () => {
    const result = await handleCreateRender(
      { videoId: "video-1" },
      {
        fetchVideoContext: jest.fn().mockResolvedValue({
          videoId: "video-1",
          listingId: "listing-1",
          userId: "user-1"
        }),
        fetchVideoJobs: jest.fn().mockResolvedValue([{}]),
        filterAndSortCompletedJobs: jest.fn().mockReturnValue([{}]),
        buildRenderJobData: jest.fn().mockReturnValue({} as never),
        renderQueue: {
          createJob: jest.fn().mockReturnValue("render-job-1"),
          getJob: jest.fn(),
          cancelJob: jest.fn()
        }
      }
    );

    expect(result).toEqual({ success: true, jobId: "render-job-1" });
  });

  it("gets render job", () => {
    const result = handleGetRenderJob("job-1", {
      createJob: jest.fn(),
      getJob: jest.fn().mockReturnValue({ status: "queued" }),
      cancelJob: jest.fn()
    });
    expect(result.status).toBe(200);
  });

  it("cancels render job", () => {
    const result = handleCancelRenderJob("job-1", {
      createJob: jest.fn(),
      getJob: jest.fn().mockReturnValue({ status: "queued" }),
      cancelJob: jest.fn().mockReturnValue(true)
    });
    expect(result.status).toBe(200);
  });
});
