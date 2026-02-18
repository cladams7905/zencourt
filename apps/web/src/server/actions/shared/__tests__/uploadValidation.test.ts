import {
  buildUploadFailure,
  isImageMimeType,
  isVideoMimeType,
  toMegabytes
} from "@web/src/server/actions/shared/uploadValidation";

describe("uploadValidation", () => {
  it("converts bytes to MB", () => {
    expect(toMegabytes(5 * 1024 * 1024)).toBe(5);
  });

  it("detects mime types", () => {
    expect(isImageMimeType("image/png")).toBe(true);
    expect(isImageMimeType("video/mp4")).toBe(false);
    expect(isVideoMimeType("video/mp4")).toBe(true);
    expect(isVideoMimeType("image/png")).toBe(false);
  });

  it("builds upload failure payload", () => {
    expect(buildUploadFailure("1", "a.jpg", "err")).toEqual({
      id: "1",
      fileName: "a.jpg",
      error: "err"
    });
  });
});
