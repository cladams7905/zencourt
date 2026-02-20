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
      status: "in-progress"
    });
  });
});
