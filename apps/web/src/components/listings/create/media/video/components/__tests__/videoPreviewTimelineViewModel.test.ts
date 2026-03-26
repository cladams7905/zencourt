import {
  buildVideoPreviewTimelineItems,
  buildVideoPreviewTimelineLayout
} from "@web/src/components/listings/create/media/video/components/videoPreviewTimelineViewModel";

describe("videoPreviewTimelineViewModel", () => {
  it("uses a fixed time scale so card widths are derived directly from clip duration", () => {
    const items = buildVideoPreviewTimelineItems([
      {
        clipId: "clip-1",
        src: "https://video/1.mp4",
        thumbnailSrc: "https://img/1.jpg",
        category: "kitchen",
        durationSeconds: 2,
        maxDurationSeconds: 4
      },
      {
        clipId: "clip-2",
        src: "https://video/2.mp4",
        thumbnailSrc: "https://img/2.jpg",
        category: "exterior",
        durationSeconds: 5,
        maxDurationSeconds: 6
      }
    ]);

    expect(items[0]?.widthPx).toBe(128);
    expect(items[1]?.widthPx).toBe(320);

    const layout = buildVideoPreviewTimelineLayout({
      items,
      fps: 30
    });

    expect(layout.contentWidthPx).toBe(448);
    expect(layout.items[0]).toMatchObject({
      startPx: 0,
      endPx: 128
    });
    expect(layout.items[1]).toMatchObject({
      startPx: 128,
      endPx: 448
    });
  });
});
