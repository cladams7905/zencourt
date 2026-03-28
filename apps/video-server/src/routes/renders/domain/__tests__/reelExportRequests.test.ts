import { parseCreateReelExportRequest } from "@/routes/renders/domain/reelExportRequests";

describe("reel export request parsing", () => {
  it("returns the validated request body", () => {
    expect(
      parseCreateReelExportRequest({
        exportId: "export-1",
        orientation: "vertical",
        clips: [
          {
            src: "https://cdn.example.com/video.mp4",
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      })
    ).toEqual({
      exportId: "export-1",
      orientation: "vertical",
      clips: [
        {
          src: "https://cdn.example.com/video.mp4",
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
        clips: []
      })
    ).toThrow("clips required");
  });
});
