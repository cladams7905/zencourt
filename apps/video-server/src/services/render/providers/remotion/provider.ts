import { existsSync } from "fs";
import { mkdir, readFile, rm } from "fs/promises";
import path from "path";
import { tmpdir } from "os";
import { bundle } from "@remotion/bundler";
import {
  ensureBrowser,
  renderMedia,
  renderStill,
  selectComposition,
  type CancelSignal
} from "@remotion/renderer";
import logger from "@/config/logger";
import type { ListingVideoInputProps } from "@/services/render/providers/remotion/composition/Root";
import type { ListingClip } from "@/services/render/providers/remotion/composition/ListingVideo";
import type { RenderProvider } from "@/services/render/ports";

const COMPOSITION_ID = "ListingVideo";

function resolveEntryPoint(): string {
  const candidates = [
    path.join(
      process.cwd(),
      "apps/video-server/src/services/render/providers/remotion/composition/Root.tsx"
    ),
    path.join(
      process.cwd(),
      "dist/apps/video-server/src/services/render/providers/remotion/composition/Root.js"
    )
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Remotion entry point not found");
}

class RemotionProvider implements RenderProvider {
  private bundleLocation: string | null = null;
  private browserReady = false;
  private cacheReady = false;

  private async ensureRemotionCacheDir(): Promise<void> {
    if (this.cacheReady) return;

    const cacheDir =
      process.env.REMOTION_CACHE_DIR ||
      process.env.TEMP_DIR ||
      path.join(process.cwd(), "tmp/video-processing");

    await mkdir(cacheDir, { recursive: true });
    process.env.REMOTION_CACHE_DIR = cacheDir;
    this.cacheReady = true;
  }

  private async getBundleLocation(): Promise<string> {
    if (this.bundleLocation) {
      return this.bundleLocation;
    }

    await this.ensureRemotionCacheDir();
    if (!this.browserReady) {
      await ensureBrowser();
      this.browserReady = true;
    }

    const entryPoint = resolveEntryPoint();
    logger.info({ entryPoint }, "[RenderProvider] Bundling Remotion project");
    this.bundleLocation = await bundle({ entryPoint, enableCaching: true });
    return this.bundleLocation;
  }

  async renderListingVideo(options: {
    clips: ListingClip[];
    orientation: "vertical" | "landscape";
    videoId: string;
    onProgress?: (progress: number) => void;
    cancelSignal?: CancelSignal;
  }): Promise<{
    videoBuffer: Buffer;
    thumbnailBuffer: Buffer;
    durationSeconds: number;
    fileSize: number;
  }> {
    const { clips, orientation, videoId } = options;

    const inputProps: ListingVideoInputProps = {
      clips,
      orientation
    };

    const bundleLocation = await this.getBundleLocation();
    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: COMPOSITION_ID,
      inputProps
    });

    const outputPath = path.join(
      tmpdir(),
      `remotion-${videoId}-${Date.now()}.mp4`
    );
    const thumbPath = path.join(
      tmpdir(),
      `remotion-${videoId}-${Date.now()}.jpg`
    );

    try {
      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: "h264",
        outputLocation: outputPath,
        inputProps,
        cancelSignal: options.cancelSignal,
        onProgress: (progress) => options.onProgress?.(progress.progress)
      });

      await renderStill({
        composition,
        serveUrl: bundleLocation,
        output: thumbPath,
        inputProps,
        imageFormat: "jpeg"
      });

      const [videoBuffer, thumbnailBuffer] = await Promise.all([
        readFile(outputPath),
        readFile(thumbPath)
      ]);

      return {
        videoBuffer,
        thumbnailBuffer,
        durationSeconds: composition.durationInFrames / composition.fps,
        fileSize: videoBuffer.length
      };
    } finally {
      await Promise.all([
        rm(outputPath, { force: true }),
        rm(thumbPath, { force: true })
      ]);
    }
  }
}

export const remotionProvider = new RemotionProvider();
