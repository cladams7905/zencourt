import {
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  inferMimeType
} from "@web/src/components/uploads/shared/constants";

describe("upload constants", () => {
  it("exposes expected image and video MIME families", () => {
    expect(IMAGE_MIME_TYPES).toContain("image/jpeg");
    expect(IMAGE_MIME_TYPES).toContain("image/webp");
    expect(VIDEO_MIME_TYPES).toContain("video/mp4");
    expect(VIDEO_MIME_TYPES).toContain("video/quicktime");
  });

  it("infers MIME type from extension and normalizes case", () => {
    expect(inferMimeType("photo.JPG")).toBe("image/jpeg");
    expect(inferMimeType("clip.MOV")).toBe("video/quicktime");
  });

  it("returns empty string for unsupported names", () => {
    expect(inferMimeType("README")).toBe("");
    expect(inferMimeType("file.unknown")).toBe("");
  });
});
