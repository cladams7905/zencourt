import {
  toMegabytes,
  isImageMimeType,
  isVideoMimeType,
  buildUploadFailure
} from "@web/src/server/models/shared/uploadValidation";

describe("uploadValidation", () => {
  describe("toMegabytes", () => {
    it("converts bytes to rounded megabytes", () => {
      expect(toMegabytes(0)).toBe(0);
      expect(toMegabytes(1024 * 1024)).toBe(1);
      expect(toMegabytes(1024 * 1024 * 2.4)).toBe(2);
      expect(toMegabytes(1024 * 1024 * 2.6)).toBe(3);
    });
  });

  describe("isImageMimeType", () => {
    it("returns true for image/* types", () => {
      expect(isImageMimeType("image/jpeg")).toBe(true);
      expect(isImageMimeType("image/png")).toBe(true);
      expect(isImageMimeType("image/webp")).toBe(true);
    });

    it("returns false for non-image types", () => {
      expect(isImageMimeType("video/mp4")).toBe(false);
      expect(isImageMimeType("application/json")).toBe(false);
      expect(isImageMimeType("")).toBe(false);
    });
  });

  describe("isVideoMimeType", () => {
    it("returns true for video/* types", () => {
      expect(isVideoMimeType("video/mp4")).toBe(true);
      expect(isVideoMimeType("video/webm")).toBe(true);
    });

    it("returns false for non-video types", () => {
      expect(isVideoMimeType("image/jpeg")).toBe(false);
      expect(isVideoMimeType("application/octet-stream")).toBe(false);
      expect(isVideoMimeType("")).toBe(false);
    });
  });

  describe("buildUploadFailure", () => {
    it("returns object with id, fileName, and error", () => {
      const result = buildUploadFailure("id-1", "file.jpg", "Too large");
      expect(result).toEqual({
        id: "id-1",
        fileName: "file.jpg",
        error: "Too large"
      });
    });
  });
});
