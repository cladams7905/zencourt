import {
  buildClipsFromJobs,
  buildRenderJobData,
  filterAndSortCompletedJobs,
  getOrientationFromJobs
} from "@/services/render/domain/composition";

describe("compositionHelpers", () => {
  it("filters to completed jobs with URL and sorts by sortOrder", () => {
    const jobs = [
      { id: "1", status: "processing", videoUrl: "a.mp4" },
      {
        id: "2",
        status: "completed",
        videoUrl: "b.mp4",
        generationSettings: { sortOrder: 2 }
      },
      {
        id: "3",
        status: "completed",
        videoUrl: "c.mp4",
        generationSettings: { sortOrder: 1 }
      },
      { id: "4", status: "completed", videoUrl: null }
    ];

    const result = filterAndSortCompletedJobs(jobs);
    expect(result.map((job) => job.id)).toEqual(["3", "2"]);
  });

  it("builds clips with duration fallbacks and overlays", () => {
    const clips = buildClipsFromJobs(
      [
        {
          id: "1",
          status: "completed",
          videoUrl: "a.mp4",
          metadata: { duration: 8 }
        },
        {
          id: "2",
          status: "completed",
          videoUrl: "b.mp4",
          generationSettings: { durationSeconds: 6 }
        },
        { id: "3", status: "completed", videoUrl: "c.mp4" }
      ],
      {
        "2": {
          text: "Hello",
          position: "bottom-third",
          background: "black",
          font: "serif-classic"
        }
      }
    );

    expect(clips[0].durationSeconds).toBe(8);
    expect(clips[1].durationSeconds).toBe(6);
    expect(clips[2].durationSeconds).toBe(5);
    expect(clips[1].textOverlay?.text).toBe("Hello");
  });

  it("builds render job data with default orientation", () => {
    const jobs = [{ id: "1", status: "completed", videoUrl: "a.mp4" }];

    expect(getOrientationFromJobs(jobs)).toBe("vertical");

    const renderJob = buildRenderJobData(
      { videoId: "v1", listingId: "l1", userId: "u1" },
      jobs
    );

    expect(renderJob.orientation).toBe("vertical");
    expect(renderJob.clips).toHaveLength(1);
  });
});
