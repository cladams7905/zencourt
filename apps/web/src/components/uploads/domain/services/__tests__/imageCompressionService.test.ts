import { compressImageToTarget } from "@web/src/components/uploads/domain/services/imageCompressionService";

describe("compressImageToTarget", () => {
  const originalCreateElement = document.createElement.bind(document);
  const originalImage = global.Image;
  const originalCreateObjectUrl = URL.createObjectURL;
  const originalRevokeObjectUrl = URL.revokeObjectURL;

  beforeEach(() => {
    URL.createObjectURL = jest.fn(() => "blob:source");
    URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    document.createElement = originalCreateElement;
    global.Image = originalImage;
    URL.createObjectURL = originalCreateObjectUrl;
    URL.revokeObjectURL = originalRevokeObjectUrl;
    jest.restoreAllMocks();
  });

  it("compresses image and returns jpeg file", async () => {
    const drawImage = jest.fn();
    const clearRect = jest.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage, clearRect }),
      toBlob: (cb: (blob: Blob | null) => void) =>
        cb(new Blob([new Uint8Array(200)], { type: "image/jpeg" }))
    };

    document.createElement = jest.fn((tagName: string) => {
      if (tagName === "canvas") {
        return canvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    class MockImage {
      decoding = "";
      src = "";
      width = 1400;
      height = 900;
      decode = jest.fn(async () => undefined);
    }
    global.Image = MockImage as unknown as typeof Image;

    const file = new File([new Uint8Array(5000)], "house.png", {
      type: "image/png"
    });
    const compressed = await compressImageToTarget(file, 1000);

    expect(compressed).not.toBeNull();
    expect(compressed?.type).toBe("image/jpeg");
    expect(compressed?.name).toBe("house.jpg");
    expect(drawImage).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:source");
  });

  it("returns null when canvas context is unavailable", async () => {
    const canvas = {
      getContext: () => null
    };

    document.createElement = jest.fn((tagName: string) => {
      if (tagName === "canvas") {
        return canvas as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    class MockImage {
      decoding = "";
      src = "";
      width = 1000;
      height = 700;
      decode = jest.fn(async () => undefined);
    }
    global.Image = MockImage as unknown as typeof Image;

    const file = new File(["x"], "broken.png", { type: "image/png" });
    const compressed = await compressImageToTarget(file, 500);

    expect(compressed).toBeNull();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:source");
  });
});
