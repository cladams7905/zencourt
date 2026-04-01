import {
  clampReelDownloadProgress,
  readReelDownloadBlob
} from "../reelExportClient";

describe("reelExportClient", () => {
  it("clamps download progress into the supported range", () => {
    expect(clampReelDownloadProgress(Number.NaN)).toBe(0);
    expect(clampReelDownloadProgress(-1)).toBe(0);
    expect(clampReelDownloadProgress(0.25)).toBe(0.25);
    expect(clampReelDownloadProgress(2)).toBe(1);
  });

  it("falls back to response.blob when the response body is unavailable", async () => {
    const blob = new Blob(["fallback"], { type: "text/plain" });
    const response = {
      body: null,
      blob: jest.fn().mockResolvedValue(blob)
    } as unknown as Response;

    await expect(
      readReelDownloadBlob(response, jest.fn())
    ).resolves.toBe(blob);
  });

  it("reads streamed chunks, reports progress, and preserves content type", async () => {
    const progress = jest.fn();
    const response = {
      body: {
        getReader: () => ({
          read: jest
            .fn()
            .mockResolvedValueOnce({
              done: false,
              value: new Uint8Array([65, 66])
            })
            .mockResolvedValueOnce({
              done: false,
              value: new Uint8Array([67, 68])
            })
            .mockResolvedValueOnce({
              done: true,
              value: undefined
            })
        })
      },
      headers: {
        get: (name: string) => {
          if (name === "content-length") {
            return "4";
          }
          if (name === "content-type") {
            return "video/mp4";
          }
          return null;
        }
      }
    } as unknown as Response;

    const blob = await readReelDownloadBlob(response, progress);

    expect(progress).toHaveBeenNthCalledWith(1, 0.5);
    expect(progress).toHaveBeenNthCalledWith(2, 1);
    expect(blob.type).toBe("video/mp4");
    expect(blob.size).toBe(4);
  });
});
