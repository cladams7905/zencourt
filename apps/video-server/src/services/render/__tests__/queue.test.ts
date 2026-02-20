import { createRenderQueue } from "@/services/render/queue";
import type { RenderJobData } from "@/services/render/types";

function tick(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function makeJobData(): RenderJobData {
  return {
    videoId: "video-1",
    listingId: "listing-1",
    userId: "user-1",
    clips: [{ src: "https://cdn/clip.mp4", durationSeconds: 2 }],
    orientation: "vertical",
    transitionDurationSeconds: 0
  };
}

describe("render queue", () => {
  it("completes a job and stores completion payload", async () => {
    const provider = {
      renderListingVideo: jest.fn().mockResolvedValue({
        videoBuffer: Buffer.from("video"),
        thumbnailBuffer: Buffer.from("thumb"),
        durationSeconds: 4,
        fileSize: 123
      })
    };
    const queue = createRenderQueue(provider);
    const onComplete = jest.fn().mockResolvedValue({
      videoUrl: "https://cdn/video.mp4",
      thumbnailUrl: "https://cdn/thumb.jpg"
    });

    const jobId = queue.createJob(
      makeJobData(),
      {
        onComplete
      },
      "job-1"
    );

    await tick();
    await tick();

    expect(jobId).toBe("job-1");
    expect(provider.renderListingVideo).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(queue.getJob("job-1")).toMatchObject({
      status: "completed",
      videoUrl: "https://cdn/video.mp4",
      thumbnailUrl: "https://cdn/thumb.jpg"
    });
  });

  it("marks job as failed when provider throws", async () => {
    const provider = {
      renderListingVideo: jest.fn().mockRejectedValue(new Error("render failed"))
    };
    const queue = createRenderQueue(provider);
    const onError = jest.fn().mockResolvedValue(undefined);

    queue.createJob(
      makeJobData(),
      {
        onError
      },
      "job-2"
    );

    await tick();
    await tick();

    expect(onError).toHaveBeenCalledTimes(1);
    expect(queue.getJob("job-2")).toMatchObject({
      status: "failed",
      error: "render failed"
    });
  });

  it("cancels an in-progress job", async () => {
    const provider = {
      renderListingVideo: jest.fn().mockImplementation(
        () => new Promise(() => {})
      )
    };

    const queue = createRenderQueue(provider);
    queue.createJob(makeJobData(), undefined, "job-3");

    await tick();
    const cancelled = queue.cancelJob("job-3");
    expect(cancelled).toBe(true);
    expect(queue.getJob("job-3")).toMatchObject({
      status: "canceled"
    });
  });

  it("returns false when canceling an already-completed job", async () => {
    const provider = {
      renderListingVideo: jest.fn().mockResolvedValue({
        videoBuffer: Buffer.from("video"),
        thumbnailBuffer: Buffer.from("thumb"),
        durationSeconds: 4,
        fileSize: 123
      })
    };
    const queue = createRenderQueue(provider);
    queue.createJob(makeJobData(), undefined, "job-4");

    await tick();
    await tick();

    expect(queue.getJob("job-4")?.status).toBe("completed");
    expect(queue.cancelJob("job-4")).toBe(false);
  });

  it("returns false when canceling an already-failed job", async () => {
    const provider = {
      renderListingVideo: jest.fn().mockRejectedValue(new Error("failed"))
    };
    const queue = createRenderQueue(provider);
    queue.createJob(makeJobData(), undefined, "job-5");

    await tick();
    await tick();

    expect(queue.getJob("job-5")?.status).toBe("failed");
    expect(queue.cancelJob("job-5")).toBe(false);
  });

  it("returns false when canceling a non-existent job", () => {
    const queue = createRenderQueue({ renderListingVideo: jest.fn() });
    expect(queue.cancelJob("does-not-exist")).toBe(false);
  });

  it("calls onStart and onProgress when provider invokes them", async () => {
    const onStart = jest.fn().mockResolvedValue(undefined);
    const onProgress = jest.fn().mockResolvedValue(undefined);

    const provider = {
      renderListingVideo: jest.fn().mockImplementation(async (options) => {
        options.onProgress?.(0.25);
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
    queue.createJob(
      makeJobData(),
      { onStart, onProgress },
      "job-progress"
    );

    await tick();
    await tick();

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(makeJobData());
    expect(onProgress).toHaveBeenCalledWith(0.25, makeJobData());
    expect(onProgress).toHaveBeenCalledWith(0.5, makeJobData());
  });

  it("cancels a queued job before processing starts", async () => {
    const provider = {
      renderListingVideo: jest.fn().mockImplementation(
        () => new Promise(() => {})
      )
    };

    process.env.RENDER_CONCURRENCY = "1";
    const queue = createRenderQueue(provider);

    queue.createJob(makeJobData(), undefined, "c-1");
    queue.createJob(makeJobData(), undefined, "c-2");

    await tick();
    const cancelled = queue.cancelJob("c-2");
    expect(cancelled).toBe(true);
    expect(queue.getJob("c-2")).toBeUndefined();

    delete process.env.RENDER_CONCURRENCY;
  });

  it("respects concurrency limit", async () => {
    let activeConcurrent = 0;
    let maxSeen = 0;

    const provider = {
      renderListingVideo: jest.fn().mockImplementation(async () => {
        activeConcurrent++;
        maxSeen = Math.max(maxSeen, activeConcurrent);
        await new Promise((resolve) => setImmediate(resolve));
        activeConcurrent--;
        return {
          videoBuffer: Buffer.from("v"),
          thumbnailBuffer: Buffer.from("t"),
          durationSeconds: 1,
          fileSize: 1
        };
      })
    };

    process.env.RENDER_CONCURRENCY = "2";
    const queue = createRenderQueue(provider);

    queue.createJob(makeJobData(), undefined, "c-1");
    queue.createJob(makeJobData(), undefined, "c-2");
    queue.createJob(makeJobData(), undefined, "c-3");

    // drain all jobs
    for (let i = 0; i < 10; i++) await tick();

    expect(maxSeen).toBeLessThanOrEqual(2);
    delete process.env.RENDER_CONCURRENCY;
  });
});
