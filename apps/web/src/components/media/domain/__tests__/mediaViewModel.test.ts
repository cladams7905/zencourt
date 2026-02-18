import {
  buildMediaCounts,
  filterAndSortMedia,
  formatBytes,
  formatUploadDate
} from "@web/src/components/media/domain/mediaViewModel";
import type { DBUserMedia } from "@shared/types/models";

const mediaItems: DBUserMedia[] = [
  {
    id: "1",
    userId: "u1",
    type: "image",
    url: "https://x/image-1.jpg",
    thumbnailUrl: null,
    usageCount: 3,
    uploadedAt: new Date("2025-01-01T00:00:00.000Z")
  },
  {
    id: "2",
    userId: "u1",
    type: "video",
    url: "https://x/video-1.mp4",
    thumbnailUrl: "https://x/video-1.jpg",
    usageCount: 10,
    uploadedAt: new Date("2025-01-02T00:00:00.000Z")
  },
  {
    id: "3",
    userId: "u1",
    type: "image",
    url: "https://x/image-2.jpg",
    thumbnailUrl: null,
    usageCount: 1,
    uploadedAt: new Date("2025-01-03T00:00:00.000Z")
  }
];

describe("mediaViewModel", () => {
  it("formats upload date from Date and string", () => {
    const fromDate = formatUploadDate(new Date("2025-01-01T00:00:00.000Z"));
    const fromString = formatUploadDate("2025-01-01T00:00:00.000Z");
    expect(fromDate).toBe(fromString);
    expect(fromDate).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4}$/);
  });

  it("formats bytes across B/KB/MB thresholds", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("filters by selected types", () => {
    const filtered = filterAndSortMedia({
      mediaItems,
      selectedTypes: ["image"],
      usageSort: "none"
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.every((item) => item.type === "image")).toBe(true);
  });

  it("keeps order when usage sort is none", () => {
    const filtered = filterAndSortMedia({
      mediaItems,
      selectedTypes: ["image", "video"],
      usageSort: "none"
    });

    expect(filtered.map((item) => item.id)).toEqual(["1", "2", "3"]);
  });

  it("sorts by usage descending and ascending", () => {
    const mostUsed = filterAndSortMedia({
      mediaItems,
      selectedTypes: ["image", "video"],
      usageSort: "most-used"
    });
    expect(mostUsed.map((item) => item.id)).toEqual(["2", "1", "3"]);

    const leastUsed = filterAndSortMedia({
      mediaItems,
      selectedTypes: ["image", "video"],
      usageSort: "least-used"
    });
    expect(leastUsed.map((item) => item.id)).toEqual(["3", "1", "2"]);
  });

  it("computes media counts", () => {
    expect(buildMediaCounts(mediaItems)).toEqual({
      totalImages: 2,
      totalVideos: 1
    });
  });
});
