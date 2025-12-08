/**
 * FFmpeg Service
 *
 * Handles individual video clip processing:
 * - Download video from URL
 * - Apply basic processing/normalization
 * - Generate thumbnails
 * - Prepare for storage upload
 *
 * This service is used for processing individual video_asset_jobs clips,
 * while videoCompositionService handles combining multiple clips.
 */

import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import logger from "@/config/logger";
import axios from "axios";

// Configure FFmpeg paths
if (!ffmpegStatic || !ffprobeStatic) {
  throw new Error("Failed to load ffmpeg/ffprobe binaries");
}

function resolveBinaryPath({
  envVar,
  staticPath,
  fallbackPaths,
  binaryName
}: {
  envVar?: string;
  staticPath?: string;
  fallbackPaths: string[];
  binaryName: string;
}): string {
  const candidates = [envVar?.trim(), staticPath, ...fallbackPaths].filter(
    Boolean
  ) as string[];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    `Unable to locate ${binaryName} binary. Checked: ${candidates.join(", ")}`
  );
}

const resolvedFfmpegPath = resolveBinaryPath({
  envVar: process.env.FFMPEG_PATH,
  staticPath:
    typeof ffmpegStatic === "string"
      ? ffmpegStatic
      : (ffmpegStatic as unknown as { path: string }).path,
  fallbackPaths: ["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"],
  binaryName: "FFmpeg"
});

const resolvedFfprobePath = resolveBinaryPath({
  envVar: process.env.FFPROBE_PATH,
  staticPath:
    typeof ffprobeStatic === "string"
      ? ffprobeStatic
      : (ffprobeStatic as { path: string }).path,
  fallbackPaths: ["/usr/bin/ffprobe", "/usr/local/bin/ffprobe"],
  binaryName: "FFprobe"
});

ffmpeg.setFfmpegPath(resolvedFfmpegPath);
ffmpeg.setFfprobePath(resolvedFfprobePath);

logger.info(
  { ffmpegPath: resolvedFfmpegPath, ffprobePath: resolvedFfprobePath },
  "[FFmpegService] FFmpeg binaries loaded"
);

/**
 * Result from video processing
 */
export interface ProcessedVideoResult {
  videoBuffer: Buffer;
  thumbnailBuffer: Buffer;
  metadata: {
    duration: number;
    fileSize: number;
    width: number;
    height: number;
    aspectRatio: string;
  };
}

/**
 * Options for processing a video
 */
export interface ProcessVideoOptions {
  sourceUrl: string; // URL to download video from (e.g., Fal.ai URL)
  jobId: string; // Job ID for logging and temp file naming
  normalize?: boolean; // Whether to normalize video format (default: true)
  targetAspectRatio?: "16:9" | "9:16"; // Optional: enforce aspect ratio
}

/**
 * FFmpeg Service for individual video processing
 */
export class FFmpegService {
  /**
   * Process a video from URL: download, normalize, generate thumbnail
   */
  async processVideo(
    options: ProcessVideoOptions
  ): Promise<ProcessedVideoResult> {
    const { sourceUrl, jobId, normalize = true, targetAspectRatio } = options;

    const tempDir = join(tmpdir(), `video-process-${jobId}-${Date.now()}`);
    const tempFiles: string[] = [];

    try {
      // Create temp directory
      if (!existsSync(tempDir)) {
        await mkdir(tempDir, { recursive: true });
      }

      logger.info(
        { jobId, sourceUrl, normalize, targetAspectRatio, tempDir },
        "[FFmpegService] Starting video processing"
      );

      // Step 1: Download video from URL
      const downloadedPath = join(tempDir, "downloaded.mp4");
      await this.downloadVideoFromUrl(sourceUrl, downloadedPath);
      tempFiles.push(downloadedPath);

      let processedVideoPath = downloadedPath;

      // Step 2: Normalize video if requested
      if (normalize) {
        const normalizedPath = join(tempDir, "normalized.mp4");
        await this.normalizeVideo(
          downloadedPath,
          normalizedPath,
          targetAspectRatio
        );
        tempFiles.push(normalizedPath);
        processedVideoPath = normalizedPath;
      }

      // Step 3: Generate thumbnail
      const thumbnailPath = join(tempDir, "thumbnail.jpg");
      await this.generateThumbnail(processedVideoPath, thumbnailPath);
      tempFiles.push(thumbnailPath);

      // Step 4: Read processed video and thumbnail
      const videoBuffer = await readFile(processedVideoPath);
      const thumbnailBuffer = await readFile(thumbnailPath);

      // Step 5: Get video metadata
      const metadata = await this.getVideoMetadata(processedVideoPath);

      logger.info(
        {
          jobId,
          duration: metadata.duration,
          fileSize: videoBuffer.length,
          resolution: `${metadata.width}x${metadata.height}`
        },
        "[FFmpegService] ✅ Video processing complete"
      );

      return {
        videoBuffer,
        thumbnailBuffer,
        metadata: {
          duration: metadata.duration,
          fileSize: videoBuffer.length,
          width: metadata.width,
          height: metadata.height,
          aspectRatio: metadata.aspectRatio
        }
      };
    } catch (error) {
      logger.error(
        { error, jobId, sourceUrl },
        "[FFmpegService] ❌ Video processing failed"
      );
      throw new Error(
        `Failed to process video: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      // Cleanup temp files
      await this.cleanupTempFiles(tempFiles);
    }
  }

  /**
   * Download video from URL to local file
   */
  private async downloadVideoFromUrl(
    url: string,
    outputPath: string
  ): Promise<void> {
    logger.info({ url, outputPath }, "[FFmpegService] Downloading video");

    try {
      const response = await axios.get(url, {
        responseType: "arraybuffer",
        timeout: 300000 // 5 minute timeout for large video files
      });

      const buffer = Buffer.from(response.data);

      if (buffer.length === 0) {
        throw new Error("Downloaded video is empty");
      }

      await writeFile(outputPath, buffer);

      logger.info(
        { outputPath, size: buffer.length },
        "[FFmpegService] ✅ Video downloaded"
      );
    } catch (error) {
      logger.error({ error, url }, "[FFmpegService] ❌ Download failed");
      throw error;
    }
  }

  /**
   * Normalize video format and optionally enforce aspect ratio
   */
  private async normalizeVideo(
    inputPath: string,
    outputPath: string,
    targetAspectRatio?: "16:9" | "9:16"
  ): Promise<void> {
    logger.info(
      { inputPath, outputPath, targetAspectRatio },
      "[FFmpegService] Normalizing video"
    );

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      // Build filter chain
      const filters: string[] = [];

      // Enforce aspect ratio if specified
      if (targetAspectRatio) {
        const [width, height] =
          targetAspectRatio === "16:9" ? [1920, 1080] : [1080, 1920];

        filters.push(
          `scale=${width}:${height}:force_original_aspect_ratio=decrease`,
          `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`
        );
      }

      // Always normalize format and fps
      filters.push("format=yuv420p", "fps=30");

      // Apply filters
      if (filters.length > 0) {
        command = command.videoFilters(filters);
      }

      command
        .outputOptions([
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          "-movflags +faststart", // Enable streaming
          "-y"
        ])
        .output(outputPath)
        .on("start", (cmd) => {
          logger.debug({ cmd }, "[FFmpeg] Normalization started");
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            logger.debug(
              { percent: Math.round(progress.percent) },
              "[FFmpeg] Normalization progress"
            );
          }
        })
        .on("end", () => {
          logger.info("[FFmpeg] ✅ Normalization complete");
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          logger.error(
            { err, stdout, stderr },
            "[FFmpeg] ❌ Normalization error"
          );
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate thumbnail from video (first frame)
   */
  private async generateThumbnail(
    videoPath: string,
    outputPath: string
  ): Promise<void> {
    logger.info(
      { videoPath, outputPath },
      "[FFmpegService] Generating thumbnail"
    );

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .inputOptions(["-ss 00:00:00.000"])
        .outputOptions(["-frames:v 1", "-q:v 2", "-y"])
        .output(outputPath)
        .on("start", (cmd) => {
          logger.debug({ cmd }, "[FFmpeg] Thumbnail generation started");
        })
        .on("end", () => {
          logger.info("[FFmpeg] ✅ Thumbnail generated");
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          logger.error(
            { err, stdout, stderr },
            "[FFmpeg] ❌ Thumbnail generation error"
          );
          reject(err);
        })
        .run();
    });
  }

  /**
   * Get video metadata using ffprobe
   */
  private async getVideoMetadata(videoPath: string): Promise<{
    duration: number;
    width: number;
    height: number;
    aspectRatio: string;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          logger.error({ err, videoPath }, "[FFmpegService] ffprobe failed");
          reject(err);
          return;
        }

        const videoStream = metadata.streams.find(
          (stream) => stream.codec_type === "video"
        );

        if (!videoStream || !metadata.format.duration) {
          reject(new Error("Could not extract video metadata"));
          return;
        }

        const width = videoStream.width || 0;
        const height = videoStream.height || 0;
        const aspectRatio =
          width && height ? (width / height).toFixed(2) : "unknown";

        resolve({
          duration: Math.round(metadata.format.duration),
          width,
          height,
          aspectRatio
        });
      });
    });
  }

  /**
   * Clean up temporary files
   */
  private async cleanupTempFiles(filePaths: string[]): Promise<void> {
    const deletePromises = filePaths.map((path) =>
      unlink(path).catch((err) => {
        logger.warn(
          { err, path },
          "[FFmpegService] Failed to delete temp file"
        );
      })
    );

    await Promise.all(deletePromises);
    logger.debug(
      { count: filePaths.length },
      "[FFmpegService] ✅ Cleaned up temp files"
    );
  }
}

// Export singleton instance
export const ffmpegService = new FFmpegService();
