jest.mock("../../storage", () => ({
  __esModule: true,
  default: {
    getSignedDownloadUrl: jest.fn()
  }
}));

jest.mock("../../vision", () => ({
  __esModule: true,
  default: {
    classifyRoomBatch: jest.fn()
  }
}));

import { ImageProcessingError, ImageProcessorService } from "../service";
import type { SerializableImageData } from "@web/src/lib/domain/listing/images";

function buildImage(partial: Partial<SerializableImageData>): SerializableImageData {
  return {
    id: partial.id ?? "img-1",
    listingId: partial.listingId ?? "listing-1",
    filename: partial.filename ?? "image.jpg",
    url: partial.url,
    category: partial.category,
    confidence: partial.confidence,
    primaryScore: partial.primaryScore,
    status: partial.status ?? "uploaded",
    isPrimary: partial.isPrimary ?? false,
    metadata: partial.metadata,
    error: partial.error,
    uploadUrl: partial.uploadUrl
  };
}

describe("imageProcessor/service", () => {
  it("analyzes uploaded images and emits progress", async () => {
    const classifyRoomBatch = jest.fn(
      async (
        imageUrls: string[],
        options?: {
          onProgress?: (
            completed: number,
            total: number,
            result: {
              imageUrl: string;
              success: boolean;
              classification: {
                category: string;
                confidence: number;
                primaryScore?: number;
                perspective?: "aerial" | "ground";
              } | null;
              error: string | null;
              duration: number;
            }
          ) => void;
        }
      ) => {
        options?.onProgress?.(1, imageUrls.length, {
          imageUrl: imageUrls[0] as string,
          success: true,
          classification: {
            category: "kitchen",
            confidence: 0.9,
            primaryScore: 0.7,
            perspective: "ground"
          },
          error: null,
          duration: 12
        });
        options?.onProgress?.(2, imageUrls.length, {
          imageUrl: imageUrls[1] as string,
          success: false,
          classification: null,
          error: "invalid response",
          duration: 7
        });
        return [];
      }
    );
    const getSignedDownloadUrl = jest
      .fn()
      .mockResolvedValueOnce({ success: true, url: "https://signed/1" })
      .mockResolvedValueOnce({ success: true, url: "https://signed/2" });
    const service = new ImageProcessorService({
      vision: { classifyRoomBatch },
      storage: { getSignedDownloadUrl }
    });
    const onProgress = jest.fn();

    const result = await service.analyzeImagesWorkflow(
      [
        buildImage({
          id: "img-1",
          url: "https://cdn.example.com/1.jpg",
          status: "uploaded",
          metadata: { width: 100, height: 100, format: "jpg", size: 1, lastModified: 1 }
        }),
        buildImage({
          id: "img-2",
          url: "https://cdn.example.com/2.jpg",
          status: "uploaded"
        }),
        buildImage({
          id: "img-3",
          status: "pending"
        })
      ],
      { onProgress, aiConcurrency: 2 }
    );

    expect(getSignedDownloadUrl).toHaveBeenCalledTimes(2);
    expect(classifyRoomBatch).toHaveBeenCalledWith(
      ["https://signed/1", "https://signed/2"],
      expect.objectContaining({ concurrency: 2, onProgress: expect.any(Function) })
    );
    expect(result.images).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "img-1",
          status: "analyzed",
          category: "kitchen",
          confidence: 0.9,
          primaryScore: 0.7,
          metadata: expect.objectContaining({ perspective: "ground" })
        }),
        expect.objectContaining({
          id: "img-2",
          status: "error",
          error: "invalid response"
        })
      ])
    );
    expect(result.categorized.kitchen).toHaveLength(1);
    expect(result.categorized.errors).toHaveLength(1);
    expect(result.stats.total).toBe(2);
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ phase: "complete", overallProgress: 100 })
    );
  });

  it("fails when there are no uploaded images for analysis", async () => {
    const service = new ImageProcessorService({
      vision: { classifyRoomBatch: jest.fn() },
      storage: { getSignedDownloadUrl: jest.fn() }
    });

    await expect(
      service.analyzeImagesWorkflow([buildImage({ status: "pending", url: undefined })])
    ).rejects.toBeInstanceOf(ImageProcessingError);
  });

  it("fails when signed URLs cannot be generated", async () => {
    const service = new ImageProcessorService({
      vision: { classifyRoomBatch: jest.fn() },
      storage: {
        getSignedDownloadUrl: jest
          .fn()
          .mockResolvedValue({ success: false, error: "sign failed" })
      }
    });

    await expect(
      service.analyzeImagesWorkflow([
        buildImage({
          id: "img-1",
          url: "https://cdn.example.com/1.jpg",
          status: "uploaded"
        })
      ])
    ).rejects.toBeInstanceOf(ImageProcessingError);
  });
});
