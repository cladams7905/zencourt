const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock("@/config/logger", () => ({
  __esModule: true,
  default: mockLogger
}));

import { prepareReelExportClips } from "@/services/render/domain/premiumReelExport";

describe("prepareReelExportClips", () => {
  async function flushTasks(iterations = 1) {
    for (let i = 0; i < iterations; i += 1) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reuses cached upscale urls for premium listing clips and bypasses user media", async () => {
    const upscaleListingClip = jest.fn();
    const persistUpscaleUrl = jest.fn();

    const result = await prepareReelExportClips(
      {
        exportId: "export-1",
        orientation: "vertical",
        quality: "premium",
        clips: [
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-1",
            originalVideoUrl: "https://cdn.example.com/clip-1.mp4",
            upscaleUrl: "https://cdn.example.com/clip-1-4k.mp4",
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          },
          {
            sourceType: "user_media",
            originalVideoUrl: "https://cdn.example.com/user-media.mp4",
            durationSeconds: 3,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      },
      {
        upscaleListingClip,
        persistUpscaleUrl
      }
    );

    expect(result).toEqual([
      expect.objectContaining({
        src: "https://cdn.example.com/clip-1-4k.mp4",
        durationSeconds: 2.5
      }),
      expect.objectContaining({
        src: "https://cdn.example.com/user-media.mp4",
        durationSeconds: 3
      })
    ]);
    expect(upscaleListingClip).not.toHaveBeenCalled();
    expect(persistUpscaleUrl).not.toHaveBeenCalled();
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        clipVersionId: "clip-version-1",
        exportId: "export-1"
      }),
      "[PremiumReelExport] Reusing cached upscale url"
    );
  });

  it("retries transient upscale failures and persists the completed url", async () => {
    const upscaleListingClip = jest
      .fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce({
        url: "https://cdn.example.com/clip-1-4k.mp4"
      });
    const persistUpscaleUrl = jest.fn().mockResolvedValue(undefined);

    const result = await prepareReelExportClips(
      {
        exportId: "export-1",
        orientation: "vertical",
        quality: "premium",
        clips: [
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-1",
            originalVideoUrl: "https://cdn.example.com/clip-1.mp4",
            upscaleUrl: null,
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      },
      {
        upscaleListingClip,
        persistUpscaleUrl
      }
    );

    expect(upscaleListingClip).toHaveBeenCalledTimes(2);
    expect(persistUpscaleUrl).toHaveBeenCalledWith(
      "clip-version-1",
      "https://cdn.example.com/clip-1-4k.mp4"
    );
    expect(result[0]).toEqual(
      expect.objectContaining({
        src: "https://cdn.example.com/clip-1-4k.mp4"
      })
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({
        clipVersionId: "clip-version-1",
        attempt: 1,
        exportId: "export-1"
      }),
      "[PremiumReelExport] Upscale attempt failed, retrying"
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        clipVersionId: "clip-version-1",
        attempt: 2,
        exportId: "export-1"
      }),
      "[PremiumReelExport] Upscale completed"
    );
  });

  it("limits concurrent premium upscales to three while preserving clip order", async () => {
    let activeCount = 0;
    let maxSeen = 0;
    const releaseResolvers: Array<() => void> = [];
    const upscaleListingClip = jest.fn().mockImplementation(
      async ({ clipVersionId }: { clipVersionId: string }) => {
        activeCount += 1;
        maxSeen = Math.max(maxSeen, activeCount);
        await new Promise<void>((resolve) => {
          releaseResolvers.push(() => {
            activeCount -= 1;
            resolve();
          });
        });
        return {
          url: `https://cdn.example.com/${clipVersionId}-4k.mp4`
        };
      }
    );
    const persistUpscaleUrl = jest.fn().mockResolvedValue(undefined);

    const promise = prepareReelExportClips(
      {
        exportId: "export-2",
        orientation: "vertical",
        quality: "premium",
        clips: [
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-1",
            originalVideoUrl: "https://cdn.example.com/clip-1.mp4",
            upscaleUrl: null,
            durationSeconds: 1,
            textOverlay: null,
            supplementalAddressOverlay: null
          },
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-2",
            originalVideoUrl: "https://cdn.example.com/clip-2.mp4",
            upscaleUrl: null,
            durationSeconds: 1,
            textOverlay: null,
            supplementalAddressOverlay: null
          },
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-3",
            originalVideoUrl: "https://cdn.example.com/clip-3.mp4",
            upscaleUrl: null,
            durationSeconds: 1,
            textOverlay: null,
            supplementalAddressOverlay: null
          },
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-4",
            originalVideoUrl: "https://cdn.example.com/clip-4.mp4",
            upscaleUrl: null,
            durationSeconds: 1,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      },
      {
        upscaleListingClip,
        persistUpscaleUrl
      }
    );

    await Promise.resolve();
    expect(maxSeen).toBe(3);
    expect(upscaleListingClip).toHaveBeenCalledTimes(3);

    const initialResolvers = releaseResolvers.splice(0);
    initialResolvers.forEach((release) => release());
    await flushTasks(3);
    expect(upscaleListingClip).toHaveBeenCalledTimes(4);
    expect(releaseResolvers).toHaveLength(1);
    releaseResolvers.splice(0).forEach((release) => release());
    const result = await promise;

    expect(maxSeen).toBe(3);
    expect(upscaleListingClip).toHaveBeenCalledTimes(4);
    expect(result.map((clip) => clip.src)).toEqual([
      "https://cdn.example.com/clip-version-1-4k.mp4",
      "https://cdn.example.com/clip-version-2-4k.mp4",
      "https://cdn.example.com/clip-version-3-4k.mp4",
      "https://cdn.example.com/clip-version-4-4k.mp4"
    ]);
  });

  it("reports upscaling progress as listing clips are prepared", async () => {
    const onListingClipPrepared = jest.fn();
    const upscaleListingClip = jest
      .fn()
      .mockResolvedValue({ url: "https://cdn.example.com/clip-version-2-4k.mp4" });
    const persistUpscaleUrl = jest.fn().mockResolvedValue(undefined);

    await prepareReelExportClips(
      {
        exportId: "export-3",
        orientation: "vertical",
        quality: "premium",
        clips: [
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-1",
            originalVideoUrl: "https://cdn.example.com/clip-1.mp4",
            upscaleUrl: "https://cdn.example.com/clip-version-1-4k.mp4",
            durationSeconds: 1,
            textOverlay: null,
            supplementalAddressOverlay: null
          },
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-2",
            originalVideoUrl: "https://cdn.example.com/clip-2.mp4",
            upscaleUrl: null,
            durationSeconds: 1,
            textOverlay: null,
            supplementalAddressOverlay: null
          },
          {
            sourceType: "user_media",
            originalVideoUrl: "https://cdn.example.com/user-media.mp4",
            durationSeconds: 1,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      },
      {
        upscaleListingClip,
        persistUpscaleUrl,
        onListingClipPrepared
      }
    );

    expect(onListingClipPrepared).toHaveBeenNthCalledWith(1, {
      completedCount: 1,
      totalCount: 2,
      clipVersionId: "clip-version-1"
    });
    expect(onListingClipPrepared).toHaveBeenNthCalledWith(2, {
      completedCount: 2,
      totalCount: 2,
      clipVersionId: "clip-version-2"
    });
  });
});
