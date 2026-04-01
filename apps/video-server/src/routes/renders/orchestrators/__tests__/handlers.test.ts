import {
  handleCancelRenderJob,
  handleCreateRender,
  handleGetRenderJob
} from "@/routes/renders/orchestrators/handlers";
import { createRenderQueue } from "@/services/render/queue";
import type { RenderJobData } from "@/services/render";

function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

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

  it("maps in-progress queue phases to reel export status values", () => {
    const result = handleGetRenderJob("job-1", {
      createJob: jest.fn(),
      getJob: jest.fn().mockReturnValue({
        status: "in-progress",
        phase: "upscaling",
        progress: 0.3
      }),
      cancelJob: jest.fn()
    });

    expect(result).toEqual({
      status: 200,
      body: {
        success: true,
        job: {
          status: "upscaling",
          progress: 0.3
        }
      }
    });
  });

  it("maps queued jobs to queued status", () => {
    const result = handleGetRenderJob("job-1", {
      createJob: jest.fn(),
      getJob: jest.fn().mockReturnValue({ status: "queued" }),
      cancelJob: jest.fn()
    });
    expect(result.body).toEqual({
      success: true,
      job: { status: "queued", progress: 0 }
    });
  });

  it("maps in-progress rendering phase to rendering status", () => {
    const result = handleGetRenderJob("job-1", {
      createJob: jest.fn(),
      getJob: jest.fn().mockReturnValue({
        status: "in-progress",
        phase: "rendering",
        progress: 0.5
      }),
      cancelJob: jest.fn()
    });
    expect(result.body).toEqual({
      success: true,
      job: { status: "rendering", progress: 0.5 }
    });
  });

  it("maps completed jobs with artifact readiness", () => {
    expect(
      handleGetRenderJob("job-1", {
        createJob: jest.fn(),
        getJob: jest.fn().mockReturnValue({
          status: "completed",
          artifactReady: true
        }),
        cancelJob: jest.fn()
      }).body
    ).toEqual({
      success: true,
      job: {
        status: "completed",
        progress: 1,
        artifactReady: true
      }
    });

    expect(
      handleGetRenderJob("job-1", {
        createJob: jest.fn(),
        getJob: jest.fn().mockReturnValue({
          status: "completed",
          artifactReady: false
        }),
        cancelJob: jest.fn()
      }).body
    ).toEqual({
      success: true,
      job: {
        status: "completed",
        progress: 1,
        artifactReady: false
      }
    });
  });

  it("maps failed and canceled jobs", () => {
    expect(
      handleGetRenderJob("job-1", {
        createJob: jest.fn(),
        getJob: jest.fn().mockReturnValue({
          status: "failed",
          error: "render crashed"
        }),
        cancelJob: jest.fn()
      }).body
    ).toEqual({
      success: true,
      job: { status: "failed", error: "render crashed" }
    });

    expect(
      handleGetRenderJob("job-1", {
        createJob: jest.fn(),
        getJob: jest.fn().mockReturnValue({ status: "canceled" }),
        cancelJob: jest.fn()
      }).body
    ).toEqual({
      success: true,
      job: { status: "canceled" }
    });
  });

  it("returns 404 for unknown queue status shapes", () => {
    const result = handleGetRenderJob("job-1", {
      createJob: jest.fn(),
      getJob: jest.fn().mockReturnValue({ status: "unknown" } as never),
      cancelJob: jest.fn()
    });
    expect(result.status).toBe(404);
  });

  it("cancels render job", () => {
    const result = handleCancelRenderJob("job-1", {
      createJob: jest.fn(),
      getJob: jest.fn().mockReturnValue({ status: "queued" }),
      cancelJob: jest.fn().mockReturnValue(true)
    });
    expect(result.status).toBe(200);
  });

  it("throws when video context is missing", async () => {
    await expect(
      handleCreateRender(
        { videoId: "video-1" },
        {
          fetchVideoContext: jest.fn().mockResolvedValue(null),
          fetchVideoJobs: jest.fn(),
          filterAndSortCompletedJobs: jest.fn(),
          buildRenderJobData: jest.fn(),
          renderQueue: {
            createJob: jest.fn(),
            getJob: jest.fn(),
            cancelJob: jest.fn()
          }
        }
      )
    ).rejects.toThrow("video without context");
  });

  it("throws when no completed jobs", async () => {
    await expect(
      handleCreateRender(
        { videoId: "video-1" },
        {
          fetchVideoContext: jest.fn().mockResolvedValue({
            videoId: "video-1",
            listingId: "listing-1",
            userId: "user-1"
          }),
          fetchVideoJobs: jest.fn().mockResolvedValue([]),
          filterAndSortCompletedJobs: jest.fn().mockReturnValue([]),
          buildRenderJobData: jest.fn(),
          renderQueue: {
            createJob: jest.fn(),
            getJob: jest.fn(),
            cancelJob: jest.fn()
          }
        }
      )
    ).rejects.toThrow("no completed jobs");
  });

  it("returns 404 when getting non-existent job", () => {
    const result = handleGetRenderJob("missing", {
      createJob: jest.fn(),
      getJob: jest.fn().mockReturnValue(undefined),
      cancelJob: jest.fn()
    });
    expect(result.status).toBe(404);
  });

  it("returns 400 when canceling a completed job", () => {
    const result = handleCancelRenderJob("job-1", {
      createJob: jest.fn(),
      getJob: jest.fn().mockReturnValue({ status: "completed" }),
      cancelJob: jest.fn()
    });
    expect(result.status).toBe(400);
  });

  it("returns 400 when cancel does not stop the queue job", () => {
    const result = handleCancelRenderJob("job-1", {
      createJob: jest.fn(),
      getJob: jest.fn().mockReturnValue({ status: "queued" }),
      cancelJob: jest.fn().mockReturnValue(false)
    });
    expect(result.status).toBe(400);
    expect(result.body).toEqual({ success: false, error: "Cancel failed" });
  });

  it("invokes onStart, onProgress, onComplete when using real queue", async () => {
    const renderData: RenderJobData = {
      videoId: "video-1",
      listingId: "listing-1",
      userId: "user-1",
      clips: [{ src: "https://cdn/clip.mp4", durationSeconds: 2 }],
      orientation: "vertical"
    };

    const provider = {
      renderListingVideo: jest.fn().mockImplementation(async (options) => {
        options.onProgress?.(0.5);
        return {
          videoBuffer: Buffer.from("v"),
          thumbnailBuffer: Buffer.from("t"),
          durationSeconds: 1,
          fileSize: 1
        };
      })
    };

    const queue = createRenderQueue(provider);

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
        buildRenderJobData: jest.fn().mockReturnValue(renderData),
        renderQueue: queue
      }
    );

    expect(result.success).toBe(true);
    expect(result.jobId).toBeDefined();

    await tick();
    await tick();

    expect(queue.getJob(result.jobId)).toMatchObject({ status: "completed" });
  });
});
