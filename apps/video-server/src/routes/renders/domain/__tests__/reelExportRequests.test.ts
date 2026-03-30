import { parseCreateReelExportRequest } from "@/routes/renders/domain/reelExportRequests";

describe("reel export request parsing", () => {
  it("returns the validated request body", () => {
    expect(
      parseCreateReelExportRequest({
        exportId: "export-1",
        orientation: "vertical",
        quality: "premium",
        clips: [
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-1",
            originalVideoUrl: "https://cdn.example.com/video.mp4",
            upscaleUrl: "https://cdn.example.com/video-4k.mp4",
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      })
    ).toEqual({
      exportId: "export-1",
      orientation: "vertical",
      quality: "premium",
      clips: [
        {
          sourceType: "listing_clip",
          clipVersionId: "clip-version-1",
          originalVideoUrl: "https://cdn.example.com/video.mp4",
          upscaleUrl: "https://cdn.example.com/video-4k.mp4",
          durationSeconds: 2.5,
          supplementalAddressOverlay: null
        }
      ]
    });
  });

  it("throws when the export clips array is empty", () => {
    expect(() =>
      parseCreateReelExportRequest({
        exportId: "export-1",
        orientation: "vertical",
        quality: "standard",
        clips: []
      })
    ).toThrow("clips required");
  });
});
