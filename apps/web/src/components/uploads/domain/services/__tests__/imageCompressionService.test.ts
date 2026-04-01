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

  it("keeps scale at 1 when the file is already under the target size", async () => {
    const drawImage = jest.fn();
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage, clearRect: jest.fn() }),
      toBlob: (cb: (blob: Blob | null) => void) =>
        cb(new Blob([new Uint8Array(400)], { type: "image/jpeg" }))
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
      width = 800;
      height = 600;
      decode = jest.fn(async () => undefined);
    }
    global.Image = MockImage as unknown as typeof Image;

    const file = new File([new Uint8Array(500)], "small.png", {
      type: "image/png"
    });
    const compressed = await compressImageToTarget(file, 10_000);

    expect(compressed).not.toBeNull();
    expect(drawImage).toHaveBeenCalledWith(
      expect.any(MockImage),
      0,
      0,
      800,
      600
    );
  });

  it("returns null when image decode fails", async () => {
    document.createElement = jest.fn((tagName: string) => {
      if (tagName === "canvas") {
        return {
          getContext: () => ({ drawImage: jest.fn(), clearRect: jest.fn() }),
          toBlob: () => {}
        } as unknown as HTMLCanvasElement;
      }
      return originalCreateElement(tagName);
    });

    class MockImage {
      decoding = "";
      src = "";
      width = 1000;
      height = 700;
      decode = jest.fn(async () => {
        throw new Error("decode failed");
      });
    }
    global.Image = MockImage as unknown as typeof Image;

    const file = new File([new Uint8Array(2000)], "x.png", { type: "image/png" });
    await expect(compressImageToTarget(file, 500)).resolves.toBeNull();
  });

  it("shrinks dimensions when quality reduction alone cannot hit the target", async () => {
    const drawImage = jest.fn();
    let call = 0;
    const canvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage, clearRect: jest.fn() }),
      toBlob: (cb: (blob: Blob | null) => void) => {
        call += 1;
        const size = call < 4 ? 5000 : 400;
        cb(new Blob([new Uint8Array(size)], { type: "image/jpeg" }));
      }
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
      width = 2000;
      height = 1500;
      decode = jest.fn(async () => undefined);
    }
    global.Image = MockImage as unknown as typeof Image;

    const file = new File([new Uint8Array(8000)], "big.png", { type: "image/png" });
    const compressed = await compressImageToTarget(file, 500);

    expect(compressed).not.toBeNull();
    expect(call).toBeGreaterThanOrEqual(4);
  });
});
