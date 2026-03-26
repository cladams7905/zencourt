import {
  buildUploadRecordInput,
  getMediaFileMetaLabel,
  validateMediaFile
} from "@web/src/components/media/domain/mediaUploadService";
import { MAX_IMAGE_BYTES, MAX_VIDEO_BYTES } from "@shared/utils/mediaUpload";

describe("mediaUploadService", () => {
  it("accepts valid image and video files", () => {
    const image = new File(["x"], "photo.jpg", { type: "image/jpeg" });
    const video = new File(["x"], "clip.mp4", { type: "video/mp4" });

    expect(validateMediaFile(image)).toEqual({ accepted: true });
    expect(validateMediaFile(video)).toEqual({ accepted: true });
  });

  it("rejects oversized image and video files", () => {
    const oversizedImage = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "big.jpg", {
      type: "image/jpeg"
    });
    const oversizedVideo = new File([new Uint8Array(MAX_VIDEO_BYTES + 1)], "big.mp4", {
      type: "video/mp4"
    });

    expect(validateMediaFile(oversizedImage)).toMatchObject({ accepted: false });
    expect(validateMediaFile(oversizedVideo)).toMatchObject({ accepted: false });
  });

  it("rejects unsupported file type", () => {
    const unsupported = new File(["x"], "doc.pdf", {
      type: "application/pdf"
    });

    expect(validateMediaFile(unsupported)).toEqual({
      accepted: false,
      error: '"doc.pdf" is not a supported file type.'
    });
  });

  it("builds upload record input", async () => {
    const createObjectURL = jest
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:video");
    const revokeObjectURL = jest
      .spyOn(URL, "revokeObjectURL")
      .mockImplementation(() => undefined);
    const load = jest.fn();
    const video = {
      preload: "",
      duration: 4.25,
      onloadedmetadata: null as null | (() => void),
      onerror: null as null | (() => void),
      removeAttribute: jest.fn(),
      load,
      set src(_: string) {
        queueMicrotask(() => this.onloadedmetadata?.());
      }
    };
    const createElement = jest
      .spyOn(document, "createElement")
      .mockReturnValue(video as unknown as HTMLVideoElement);

    const record = await buildUploadRecordInput({
      upload: { key: "media/key", type: "video" },
      file: new File(["x"], "clip.mp4", { type: "video/mp4" }),
      thumbnailKey: "thumb/key",
      thumbnailFailed: false
    });

    expect(record).toEqual({
      key: "media/key",
      type: "video",
      thumbnailKey: "thumb/key",
      durationSeconds: 4.25
    });

    createElement.mockRestore();
    createObjectURL.mockRestore();
    revokeObjectURL.mockRestore();
  });

  it("throws when media type is missing", () => {
    return expect(
      buildUploadRecordInput({
        upload: { key: "media/key" },
        file: new File(["x"], "clip.mp4", { type: "video/mp4" }),
        thumbnailFailed: false
      })
    ).rejects.toThrow("Missing media type.");
  });

  it("formats media file meta label", () => {
    const image = new File([new Uint8Array(1024)], "photo.jpg", {
      type: "image/jpeg"
    });
    const video = new File([new Uint8Array(2048)], "clip.mp4", {
      type: "video/mp4"
    });

    expect(getMediaFileMetaLabel(image)).toContain("Image");
    expect(getMediaFileMetaLabel(video)).toContain("Video");
  });
});
