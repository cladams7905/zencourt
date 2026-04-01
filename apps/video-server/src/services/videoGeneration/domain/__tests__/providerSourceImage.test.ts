import sharp from "sharp";
import {
  prepareProviderSourceImage,
  resolveProviderSourceImageSize
} from "@/services/videoGeneration/domain/providerSourceImage";

describe("providerSourceImage", () => {
  it("keeps the original image url when the source already matches the target ratio", async () => {
    const sourceBuffer = await sharp({
      create: {
        width: 1600,
        height: 900,
        channels: 3,
        background: { r: 200, g: 160, b: 120 }
      }
    })
      .jpeg()
      .toBuffer();

    const downloadBuffer = jest.fn().mockResolvedValue({ buffer: sourceBuffer });
    const uploadFile = jest.fn();

    const result = await prepareProviderSourceImage(
      {
        imageUrl: "https://cdn/source.jpg",
        userId: "user-1",
        listingId: "listing-1",
        videoId: "video-1",
        jobId: "job-1",
        targetSize: { width: 1920, height: 1080 }
      },
      { downloadBuffer, uploadFile }
    );

    expect(result).toBe("https://cdn/source.jpg");
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("crops and uploads a derived image when the source ratio does not match", async () => {
    const sourceBuffer = await sharp({
      create: {
        width: 900,
        height: 1600,
        channels: 3,
        background: { r: 80, g: 140, b: 220 }
      }
    })
      .jpeg()
      .toBuffer();

    const downloadBuffer = jest.fn().mockResolvedValue({ buffer: sourceBuffer });
    const uploadFile = jest
      .fn()
      .mockResolvedValue("https://storage/job-1/source-1920x1080.jpg");

    const result = await prepareProviderSourceImage(
      {
        imageUrl: "https://cdn/source.jpg",
        userId: "user-1",
        listingId: "listing-1",
        videoId: "video-1",
        jobId: "job-1",
        targetSize: { width: 1920, height: 1080 }
      },
      { downloadBuffer, uploadFile }
    );

    expect(result).toBe("https://storage/job-1/source-1920x1080.jpg");
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(uploadFile).toHaveBeenCalledWith(
      expect.objectContaining({
        key: expect.stringContaining("jobs/job_job-1/source-1920x1080.jpg"),
        contentType: "image/jpeg"
      })
    );

    const uploadedBody = uploadFile.mock.calls[0]?.[0]?.body as Buffer;
    const metadata = await sharp(uploadedBody).metadata();
    expect(metadata.width).toBe(1920);
    expect(metadata.height).toBe(1080);
    expect(metadata.format).toBe("jpeg");
  });

  it("fails open and returns the original image url when processing fails", async () => {
    const downloadBuffer = jest
      .fn()
      .mockRejectedValue(new Error("download failed"));

    const result = await prepareProviderSourceImage(
      {
        imageUrl: "https://cdn/source.jpg",
        userId: "user-1",
        listingId: "listing-1",
        videoId: "video-1",
        jobId: "job-1",
        targetSize: { width: 1920, height: 1080 }
      },
      { downloadBuffer, uploadFile: jest.fn() }
    );

    expect(result).toBe("https://cdn/source.jpg");
  });

  it("resolves 16:9 for veo and vertical 9:16 for gen4.5", () => {
    expect(
      resolveProviderSourceImageSize({
        model: "veo3.1_fast",
        orientation: "vertical"
      })
    ).toEqual({ width: 1920, height: 1080 });
    expect(
      resolveProviderSourceImageSize({
        model: "gen4.5",
        orientation: "vertical"
      })
    ).toEqual({ width: 1080, height: 1920 });
  });

  it("defaults to veo3.1_fast size when model is omitted", () => {
    expect(
      resolveProviderSourceImageSize({ orientation: "vertical" })
    ).toEqual({ width: 1920, height: 1080 });
  });

  it("uses landscape 16:9 for gen4.5 when orientation is landscape", () => {
    expect(
      resolveProviderSourceImageSize({
        model: "gen4.5",
        orientation: "landscape"
      })
    ).toEqual({ width: 1920, height: 1080 });
  });

  it("logs and returns the original url when prepare fails with a non-Error rejection", async () => {
    const downloadBuffer = jest.fn().mockRejectedValue("network");

    const result = await prepareProviderSourceImage(
      {
        imageUrl: "https://cdn/source.jpg",
        userId: "user-1",
        listingId: "listing-1",
        videoId: "video-1",
        jobId: "job-1",
        targetSize: { width: 1920, height: 1080 }
      },
      { downloadBuffer, uploadFile: jest.fn() }
    );

    expect(result).toBe("https://cdn/source.jpg");
  });
});
