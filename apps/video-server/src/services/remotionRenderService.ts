import { existsSync } from "fs";
import { readFile, rm } from "fs/promises";
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
import type { ListingClip } from "@/remotion/ListingVideo";
import type { ListingVideoInputProps } from "@/remotion";

type RenderResult = {
  videoBuffer: Buffer;
  thumbnailBuffer: Buffer;
  durationSeconds: number;
  fileSize: number;
};

const COMPOSITION_ID = "ListingVideo";

function resolveEntryPoint(): string {
  const candidates = [
    path.join(process.cwd(), "apps/video-server/src/remotion/index.tsx"),
    path.join(process.cwd(), "dist/apps/video-server/src/remotion/index.js")
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error("Remotion entry point not found");
}

class RemotionRenderService {
  private bundleLocation: string | null = null;
  private browserReady = false;

  private async getBundleLocation(): Promise<string> {
    if (this.bundleLocation) {
      return this.bundleLocation;
    }

    if (!this.browserReady) {
      await ensureBrowser();
      this.browserReady = true;
    }

    const entryPoint = resolveEntryPoint();
    logger.info({ entryPoint }, "[RemotionRender] Bundling Remotion project");
    this.bundleLocation = await bundle({ entryPoint, enableCaching: true });
    return this.bundleLocation;
  }

  async renderListingVideo(options: {
    clips: ListingClip[];
    orientation: "vertical" | "landscape";
    transitionDurationSeconds?: number;
    videoId: string;
    onProgress?: (progress: number) => void;
    cancelSignal?: CancelSignal;
  }): Promise<RenderResult> {
    const { clips, orientation, videoId } = options;
    const transitionDurationSeconds = options.transitionDurationSeconds ?? 0.5;

    const inputProps: ListingVideoInputProps = {
      clips,
      transitionDurationSeconds,
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
      logger.info(
        {
          videoId,
          durationInFrames: composition.durationInFrames
        },
        "[RemotionRender] Starting render"
      );

      await renderMedia({
        composition,
        serveUrl: bundleLocation,
        codec: "h264",
        outputLocation: outputPath,
        inputProps,
        cancelSignal: options.cancelSignal,
        onProgress: (progress) => {
          options.onProgress?.(progress.progress);
        }
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

  async renderThumbnailFromVideo(options: {
    videoUrl: string;
    orientation: "vertical" | "landscape";
    videoId: string;
    jobId: string;
  }): Promise<Buffer> {
    const bundleLocation = await this.getBundleLocation();
    const inputProps: ListingVideoInputProps = {
      clips: [{ src: options.videoUrl, durationSeconds: 1 }],
      transitionDurationSeconds: 0,
      orientation: options.orientation
    };

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: COMPOSITION_ID,
      inputProps
    });

    const outputPath = path.join(
      tmpdir(),
      `remotion-thumb-${options.videoId}-${options.jobId}-${Date.now()}.jpg`
    );

    try {
      await renderStill({
        composition,
        serveUrl: bundleLocation,
        output: outputPath,
        inputProps,
        imageFormat: "jpeg"
      });

      return await readFile(outputPath);
    } finally {
      await rm(outputPath, { force: true });
    }
  }
}

export const remotionRenderService = new RemotionRenderService();
