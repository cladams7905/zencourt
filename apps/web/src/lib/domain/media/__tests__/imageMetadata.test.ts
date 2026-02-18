import { getImageMetadataFromFile } from "@web/src/lib/domain/media/imageMetadata";

describe("imageMetadata", () => {
  it("returns base metadata for non-image file", async () => {
    const file = { type: "text/plain", size: 10, lastModified: 1 } as File;
    const result = await getImageMetadataFromFile(file);
    expect(result).toEqual({ width: 0, height: 0, format: "text/plain", size: 10, lastModified: 1 });
  });

  it("reads dimensions for image files", async () => {
    Object.defineProperty(global, "URL", {
      writable: true,
      value: {
        createObjectURL: jest.fn(() => "blob:img"),
        revokeObjectURL: jest.fn()
      }
    });

    class MockImage {
      onload: null | (() => void) = null;
      onerror: null | (() => void) = null;
      naturalWidth = 1920;
      naturalHeight = 1080;
      set src(_value: string) {
        setTimeout(() => this.onload?.(), 0);
      }
    }

    Object.defineProperty(global, "Image", { writable: true, value: MockImage });

    const file = { type: "image/jpeg", size: 20, lastModified: 2 } as File;
    const result = await getImageMetadataFromFile(file);

    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:img");
  });
});
