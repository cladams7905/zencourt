import { createVideoThumbnailBlob } from "@web/src/components/uploads/domain/services/videoThumbnailService";

describe("createVideoThumbnailBlob", () => {
  const originalCreateElement = document.createElement.bind(document);
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => "blob:video");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    jest.restoreAllMocks();
  });

  it("captures a thumbnail blob from loaded video", async () => {
    const drawImage = jest.fn();
    let videoEl: {
      preload?: string;
      muted?: boolean;
      playsInline?: boolean;
      src?: string;
      duration?: number;
      videoWidth?: number;
      videoHeight?: number;
      currentTime?: number;
      onloadedmetadata?: () => void;
      onseeked?: () => void;
      onerror?: () => void;
      remove: jest.Mock;
    };

    const canvasEl = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage }),
      toBlob: (cb: (blob: Blob | null) => void) =>
        cb(new Blob([new Uint8Array(20)], { type: "image/jpeg" }))
    };

    document.createElement = jest.fn((tagName: string) => {
      if (tagName === "video") {
        videoEl = {
          duration: 2,
          videoWidth: 800,
          videoHeight: 400,
          remove: jest.fn()
        };
        return videoEl as unknown as HTMLVideoElement;
      }
      if (tagName === "canvas") {
        return canvasEl as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    const promise = createVideoThumbnailBlob(
      new File(["video"], "tour.mp4", { type: "video/mp4" })
    );
    videoEl!.onloadedmetadata?.();
    videoEl!.onseeked?.();
    const blob = await promise;

    expect(blob).not.toBeNull();
    expect(videoEl!.currentTime).toBe(0.1);
    expect(drawImage).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:video");
    expect(videoEl!.remove).toHaveBeenCalled();
  });

  it("returns null when video emits an error", async () => {
    let videoEl: {
      onerror?: () => void;
      remove: jest.Mock;
    };

    document.createElement = jest.fn((tagName: string) => {
      if (tagName === "video") {
        videoEl = { remove: jest.fn() };
        return videoEl as unknown as HTMLVideoElement;
      }
      return originalCreateElement(tagName);
    });

    const promise = createVideoThumbnailBlob(
      new File(["video"], "tour.mp4", { type: "video/mp4" })
    );
    videoEl!.onerror?.();
    const blob = await promise;

    expect(blob).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:video");
    expect(videoEl!.remove).toHaveBeenCalled();
  });
});
