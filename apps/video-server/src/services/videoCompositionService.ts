/**
 * Video Composition Service
 *
 * Handles video composition including combining room videos,
 * applying logo overlays, subtitles, and generating thumbnails using FFmpeg
 *
 * Ported from Vercel to Express with Backblaze B2 storage
 */

import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import { writeFile, readFile, unlink, rm, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import logger from "@/config/logger";
import { storageService } from "./storageService";
import { env } from "@/config/env";
import type {
  ComposedVideoResult,
  LogoPosition,
  SubtitleData,
  VideoCompositionSettings
} from "@shared/types/video/composition";

// Configure FFmpeg paths
if (!ffmpegStatic || !ffprobeStatic) {
  throw new Error("Failed to load ffmpeg/ffprobe binaries");
}

const ffprobeBinaryPath = "/usr/bin/ffprobe";

logger.info(
  { ffmpegPath: ffmpegStatic, ffprobePath: ffprobeBinaryPath },
  "[VideoComposition] FFmpeg binaries loaded"
);

ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeBinaryPath);

// ============================================================================
// Main Composition Class
// ============================================================================

export class VideoCompositionService {
  /**
   * Combine multiple room videos into a final video with overlays
   */
  async combineRoomVideos(
    roomVideoUrls: string[],
    compositionSettings: VideoCompositionSettings,
    userId: string,
    projectId: string,
    finalVideoId: string,
    projectName?: string
  ): Promise<ComposedVideoResult> {
    const tempDir = join(
      tmpdir(),
      `video-composition-${projectId}-${Date.now()}`
    );
    const tempFiles: string[] = [];

    try {
      // Create temp directory
      if (!existsSync(tempDir)) {
        await mkdir(tempDir, { recursive: true });
      }

      logger.info(
        {
          roomVideosCount: roomVideoUrls.length,
          projectId,
          finalVideoId,
          tempDir
        },
        "[VideoComposition] Starting composition"
      );

      // Step 1: Download all room videos from B2 to temp directory
      const downloadedVideos = await this.downloadRoomVideosToTemp(
        roomVideoUrls,
        tempDir
      );
      tempFiles.push(...downloadedVideos);

      // Step 2: Concatenate videos with transitions
      const concatenatedPath = join(tempDir, "concatenated.mp4");
      await this.concatenateVideos(
        downloadedVideos,
        concatenatedPath,
        Boolean(compositionSettings.transitions)
      );
      tempFiles.push(concatenatedPath);

      let finalVideoPath = concatenatedPath;

      // Step 3: Apply logo overlay if provided
      if (compositionSettings.logo) {
        const logoPath = join(tempDir, "logo.png");
        await this.downloadLogoToTemp(
          compositionSettings.logo.storageUrl,
          logoPath
        );
        tempFiles.push(logoPath);

        const videoWithLogoPath = join(tempDir, "with_logo.mp4");
        await this.applyLogoOverlay(
          finalVideoPath,
          logoPath,
          videoWithLogoPath,
          compositionSettings.logo.position
        );
        tempFiles.push(videoWithLogoPath);
        finalVideoPath = videoWithLogoPath;
      }

      // Step 4: Apply subtitles if enabled
      if (compositionSettings.subtitles?.enabled) {
        const subtitlesPath = join(tempDir, "subtitles.srt");
        await this.generateSubtitleFile(
          compositionSettings.subtitles.text,
          subtitlesPath,
          await this.getVideoDuration(finalVideoPath)
        );
        tempFiles.push(subtitlesPath);

        const videoWithSubsPath = join(tempDir, "with_subtitles.mp4");
        await this.applySubtitles(
          finalVideoPath,
          subtitlesPath,
          videoWithSubsPath,
          compositionSettings.subtitles.font
        );
        tempFiles.push(videoWithSubsPath);
        finalVideoPath = videoWithSubsPath;
      }

      // Step 5: Generate thumbnail
      const thumbnailPath = join(tempDir, "thumbnail.jpg");
      await this.generateThumbnail(finalVideoPath, thumbnailPath);
      tempFiles.push(thumbnailPath);

      // Step 6: Read final video and thumbnail
      const videoBuffer = await readFile(finalVideoPath);
      const thumbnailBuffer = await readFile(thumbnailPath);

      // Step 7: Upload to Backblaze B2
      logger.info(
        { projectId, finalVideoId },
        "[VideoComposition] Uploading final video and thumbnail to Backblaze B2"
      );

      const baseVideoPath = `user_${userId}/projects/project_${projectId}/videos/video_${finalVideoId}`;
      const videoKey = `${baseVideoPath}/final.mp4`;
      const thumbnailKey = `${baseVideoPath}/thumbnail.jpg`;

      const [videoUrl, thumbnailUrl] = await Promise.all([
        storageService.uploadFile({
          key: videoKey,
          body: videoBuffer,
          contentType: "video/mp4",
          metadata: {
            userId,
            projectId,
            videoId: finalVideoId,
            projectName: projectName || ""
          }
        }),
        storageService.uploadFile({
          key: thumbnailKey,
          body: thumbnailBuffer,
          contentType: "image/jpeg",
          metadata: {
            userId,
            projectId,
            videoId: finalVideoId
          }
        })
      ]);

      // Get video metadata
      const duration = await this.getVideoDuration(finalVideoPath);

      logger.info(
        {
          projectId,
          finalVideoId,
          duration,
          fileSize: videoBuffer.length
        },
        "[VideoComposition] ✅ Composition complete"
      );

      return {
        videoUrl,
        thumbnailUrl,
        duration,
        fileSize: videoBuffer.length
      };
    } catch (error) {
      logger.error(
        { error, projectId, finalVideoId },
        "[VideoComposition] ❌ Composition failed"
      );
      throw new Error(
        `Failed to compose video: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      // Cleanup temp files
      await this.cleanupTempFiles(tempFiles);
      // Cleanup temp directory
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        logger.warn(
          { error, tempDir },
          "[VideoComposition] Failed to cleanup temp directory"
        );
      }
    }
  }

  // ============================================================================
  // Video Download & Preparation
  // ============================================================================

  /**
   * Download room videos from Backblaze B2 to temporary directory
   */
  private async downloadRoomVideosToTemp(
    videoUrls: string[],
    tempDir: string
  ): Promise<string[]> {
    logger.info(
      { count: videoUrls.length },
      "[VideoComposition] Downloading room videos from Backblaze B2"
    );

    const downloadPromises = videoUrls.map(async (url, index) => {
      // Extract storage key from URL
      const storageKey = this.extractStorageKeyFromUrl(url);
      const videoBuffer = await storageService.downloadFile(
        env.storageBucket,
        storageKey
      );

      const videoPath = join(tempDir, `room_${index}.mp4`);
      await writeFile(videoPath, videoBuffer);

      logger.info(
        { index, videoPath, size: videoBuffer.length },
        "[VideoComposition] Downloaded room video"
      );
      return videoPath;
    });

    return await Promise.all(downloadPromises);
  }

  /**
   * Download logo from Backblaze B2 to temporary directory
   */
  private async downloadLogoToTemp(
    storageUrl: string,
    logoPath: string
  ): Promise<void> {
    logger.info(
      { storageUrl, logoPath },
      "[VideoComposition] Downloading logo from Backblaze B2"
    );

    const storageKey = this.extractStorageKeyFromUrl(storageUrl);
    const logoBuffer = await storageService.downloadFile(
      env.storageBucket,
      storageKey
    );
    await writeFile(logoPath, logoBuffer);

    logger.info(
      { logoPath, size: logoBuffer.length },
      "[VideoComposition] Downloaded logo"
    );
  }

  /**
   * Extract storage key from Backblaze-compatible URLs
   */
  private extractStorageKeyFromUrl(url: string): string {
    // Handle format: https://bucket.s3.region.amazonaws.com/key
    // or: https://s3.region.amazonaws.com/bucket/key
    const urlObj = new URL(url);
    let pathname = urlObj.pathname.replace(/^\/+/, "");

    return pathname.startsWith(`${env.storageBucket}/`)
      ? pathname.substring(env.storageBucket.length + 1)
      : pathname;
  }

  // ============================================================================
  // Video Concatenation
  // ============================================================================

  /**
   * Concatenate multiple videos with optional transitions
   */
  private async concatenateVideos(
    videoPaths: string[],
    outputPath: string,
    withTransitions: boolean
  ): Promise<void> {
    logger.info(
      { count: videoPaths.length, withTransitions },
      "[VideoComposition] Concatenating videos"
    );

    // Special case: single video - just re-encode without filters
    if (videoPaths.length === 1) {
      return new Promise((resolve, reject) => {
        const command = ffmpeg();
        command
          .input(videoPaths[0])
          .outputOptions(["-c:v libx264", "-preset medium", "-crf 23", "-y"])
          .output(outputPath)
          .on("start", (cmd) => {
            logger.debug({ cmd }, "[FFmpeg] Re-encoding single video");
          })
          .on("progress", (progress) => {
            if (progress.percent) {
              logger.debug(
                { percent: Math.round(progress.percent) },
                "[FFmpeg] Re-encoding progress"
              );
            }
          })
          .on("end", () => {
            logger.info("[FFmpeg] ✅ Re-encoding complete");
            resolve();
          })
          .on("error", (err, stdout, stderr) => {
            logger.error(
              { err, stdout, stderr },
              "[FFmpeg] ❌ Re-encoding error"
            );
            reject(err);
          })
          .run();
      });
    }

    // Multiple videos: get durations and metadata first if using transitions
    let videoDurations: number[] = [];
    if (withTransitions) {
      logger.debug(
        "[VideoComposition] Getting video durations for transition offsets"
      );
      videoDurations = await Promise.all(
        videoPaths.map((path) => this.getVideoDuration(path))
      );
      logger.debug({ videoDurations }, "[VideoComposition] Video durations");
    }

    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      // Add all video inputs
      videoPaths.forEach((path) => {
        command.input(path);
      });

      const filterComplex = withTransitions
        ? this.buildTransitionFilter(videoPaths.length, videoDurations)
        : this.buildSimpleConcatFilter(videoPaths.length);

      command
        .complexFilter(filterComplex)
        .outputOptions([
          "-map [outv]",
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          "-y"
        ])
        .output(outputPath)
        .on("start", (cmd) => {
          logger.debug({ cmd }, "[FFmpeg] Concatenation started");
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            logger.debug(
              { percent: Math.round(progress.percent) },
              "[FFmpeg] Concatenation progress"
            );
          }
        })
        .on("end", () => {
          logger.info("[FFmpeg] ✅ Concatenation complete");
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          logger.error(
            { err, stdout, stderr },
            "[FFmpeg] ❌ Concatenation error"
          );
          reject(err);
        })
        .run();
    });
  }

  /**
   * Build simple concatenation filter (no transitions, video only)
   */
  private buildSimpleConcatFilter(videoCount: number): string {
    const inputs = Array.from(
      { length: videoCount },
      (_, i) => `[${i}:v]`
    ).join("");
    return `${inputs}concat=n=${videoCount}:v=1:a=0[outv]`;
  }

  /**
   * Build concatenation filter with crossfade transitions (video only)
   */
  private buildTransitionFilter(
    videoCount: number,
    videoDurations: number[]
  ): string {
    const fadeDuration = 0.5; // 0.5 second crossfade

    // Special case for 2 videos
    if (videoCount === 2) {
      const offset = videoDurations[0] - fadeDuration;
      logger.debug(
        { offset, fadeDuration },
        "[VideoComposition] Building xfade filter for 2 videos"
      );

      const filter = `[0:v]format=yuv420p,fps=30,scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];[1:v]format=yuv420p,fps=30,scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];[v0][v1]xfade=transition=fade:duration=${fadeDuration}:offset=${offset},format=yuv420p[outv]`;
      return filter;
    }

    // For 3+ videos: chain xfade filters
    logger.debug(
      { videoCount, fadeDuration },
      "[VideoComposition] Building xfade filter for multiple videos"
    );

    const filters: string[] = [];

    // Normalize all inputs to same format, fps, scale, and aspect ratio
    for (let i = 0; i < videoCount; i++) {
      filters.push(
        `[${i}:v]format=yuv420p,fps=30,scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`
      );
    }

    // Chain xfade filters
    for (let i = 0; i < videoCount - 1; i++) {
      const isFirst = i === 0;
      const isLast = i === videoCount - 2;

      const input1 = isFirst ? `v${i}` : `xf${i - 1}`;
      const input2 = `v${i + 1}`;
      const output = isLast ? "outv" : `xf${i}`;

      // Offset calculation
      let offset: number;
      if (isFirst) {
        offset = videoDurations[0] - fadeDuration;
      } else {
        const accumulatedDuration =
          videoDurations.slice(0, i + 1).reduce((a, b) => a + b, 0) -
          i * fadeDuration;
        offset = accumulatedDuration - fadeDuration;
      }

      if (isLast) {
        filters.push(
          `[${input1}][${input2}]xfade=transition=fade:duration=${fadeDuration}:offset=${offset},format=yuv420p[${output}]`
        );
      } else {
        filters.push(
          `[${input1}][${input2}]xfade=transition=fade:duration=${fadeDuration}:offset=${offset}[${output}]`
        );
      }
    }

    return filters.join(";");
  }

  // ============================================================================
  // Logo Overlay
  // ============================================================================

  /**
   * Apply logo overlay to video
   */
  private async applyLogoOverlay(
    videoPath: string,
    logoPath: string,
    outputPath: string,
    position: LogoPosition
  ): Promise<void> {
    logger.info({ position }, "[VideoComposition] Applying logo overlay");

    return new Promise((resolve, reject) => {
      const overlayPosition = this.getLogoOverlayPosition(position);

      ffmpeg(videoPath)
        .input(logoPath)
        .complexFilter([
          "[1:v]scale='min(500,iw)':'min(500,ih)':force_original_aspect_ratio=decrease[logo]",
          `[0:v][logo]overlay=${overlayPosition}[outv]`
        ])
        .outputOptions(["-c:v libx264", "-preset medium", "-crf 23"])
        .output(outputPath)
        .on("start", (cmd) => {
          logger.debug({ cmd }, "[FFmpeg] Logo overlay started");
        })
        .on("end", () => {
          logger.info("[FFmpeg] ✅ Logo overlay complete");
          resolve();
        })
        .on("error", (err) => {
          logger.error({ err }, "[FFmpeg] ❌ Logo overlay error");
          reject(err);
        })
        .run();
    });
  }

  /**
   * Get FFmpeg overlay position string for logo
   */
  private getLogoOverlayPosition(position: LogoPosition): string {
    const padding = 20;
    const positions: Record<LogoPosition, string> = {
      "top-left": `${padding}:${padding}`,
      "top-right": `W-w-${padding}:${padding}`,
      "bottom-left": `${padding}:H-h-${padding}`,
      "bottom-right": `W-w-${padding}:H-h-${padding}`
    };
    return positions[position];
  }

  // ============================================================================
  // Subtitle Overlay
  // ============================================================================

  /**
   * Generate SRT subtitle file
   */
  private async generateSubtitleFile(
    text: string,
    subtitlesPath: string,
    videoDuration: number
  ): Promise<void> {
    logger.info("[VideoComposition] Generating subtitle file");

    // Split text into chunks if too long (max 40 characters per subtitle)
    const maxCharsPerSubtitle = 40;
    const words = text.split(" ");
    const subtitles: SubtitleData[] = [];

    let currentSubtitle = "";
    let currentStartTime = 0;
    const secondsPerSubtitle = 3; // Each subtitle displays for 3 seconds

    for (const word of words) {
      if ((currentSubtitle + " " + word).length > maxCharsPerSubtitle) {
        if (currentSubtitle) {
          subtitles.push({
            startTime: currentStartTime,
            endTime: Math.min(
              currentStartTime + secondsPerSubtitle,
              videoDuration
            ),
            text: currentSubtitle.trim()
          });
          currentStartTime += secondsPerSubtitle;
          currentSubtitle = word;
        }
      } else {
        currentSubtitle += (currentSubtitle ? " " : "") + word;
      }
    }

    // Add last subtitle
    if (currentSubtitle) {
      subtitles.push({
        startTime: currentStartTime,
        endTime: Math.min(currentStartTime + secondsPerSubtitle, videoDuration),
        text: currentSubtitle.trim()
      });
    }

    // Generate SRT content
    const srtContent = subtitles
      .map((sub, index) => {
        const start = this.formatSrtTime(sub.startTime);
        const end = this.formatSrtTime(sub.endTime);
        return `${index + 1}\n${start} --> ${end}\n${sub.text}\n`;
      })
      .join("\n");

    await writeFile(subtitlesPath, srtContent, "utf-8");
    logger.info(
      { subtitleCount: subtitles.length },
      "[VideoComposition] ✅ Subtitle file generated"
    );
  }

  /**
   * Format time in SRT format (HH:MM:SS,mmm)
   */
  private formatSrtTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")},${milliseconds
      .toString()
      .padStart(3, "0")}`;
  }

  /**
   * Apply subtitles to video
   */
  private async applySubtitles(
    videoPath: string,
    subtitlesPath: string,
    outputPath: string,
    font: string = "Arial"
  ): Promise<void> {
    logger.info("[VideoComposition] Applying subtitles");

    return new Promise((resolve, reject) => {
      // Escape the subtitles path for FFmpeg filter
      const escapedSubPath = subtitlesPath
        .replace(/\\/g, "/")
        .replace(/:/g, "\\:");

      ffmpeg(videoPath)
        .outputOptions([
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          `-vf subtitles=${escapedSubPath}:force_style='FontName=${font},FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'`
        ])
        .output(outputPath)
        .on("start", (cmd) => {
          logger.debug({ cmd }, "[FFmpeg] Subtitle overlay started");
        })
        .on("end", () => {
          logger.info("[FFmpeg] ✅ Subtitle overlay complete");
          resolve();
        })
        .on("error", (err) => {
          logger.error({ err }, "[FFmpeg] ❌ Subtitle overlay error");
          reject(err);
        })
        .run();
    });
  }

  // ============================================================================
  // Thumbnail Generation
  // ============================================================================

  /**
   * Generate thumbnail from first frame of video
   */
  async generateThumbnail(
    videoPath: string,
    outputPath?: string
  ): Promise<string> {
    const thumbnailPath =
      outputPath || join(tmpdir(), `thumbnail-${Date.now()}.jpg`);

    logger.info({ thumbnailPath }, "[VideoComposition] Generating thumbnail");

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .inputOptions(["-ss 00:00:00.000"])
        .outputOptions(["-frames:v 1", "-q:v 2", "-y"])
        .output(thumbnailPath)
        .on("start", (cmd) => {
          logger.debug({ cmd }, "[FFmpeg] Thumbnail generation started");
        })
        .on("end", () => {
          logger.info("[FFmpeg] ✅ Thumbnail generated");
          resolve(thumbnailPath);
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

  // ============================================================================
  // Utility Functions
  // ============================================================================

  /**
   * Get video duration in seconds
   */
  private async getVideoDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format.duration || 0);
        }
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
          "[VideoComposition] Failed to delete temp file"
        );
      })
    );

    await Promise.all(deletePromises);
    logger.info(
      { count: filePaths.length },
      "[VideoComposition] ✅ Cleaned up temp files"
    );
  }
}

// Export singleton instance
export const videoCompositionService = new VideoCompositionService();
