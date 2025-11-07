/**
 * Video Composition Service
 *
 * Handles video composition including combining room videos,
 * applying logo overlays, subtitles, and generating thumbnails using FFmpeg
 */

import type {
  VideoCompositionSettings,
  ComposedVideoResult,
  LogoPosition,
  SubtitleData
} from "@/types/video-generation";
import {
  downloadVideoFromUrl,
  uploadFinalVideo,
  uploadThumbnail
} from "./storage";

// Dynamic imports for server-only modules
let ffmpeg: typeof import("fluent-ffmpeg");
let ffmpegPath: { path: string };
let ffprobePath: { path: string };
let writeFile: typeof import("fs/promises").writeFile;
let readFile: typeof import("fs/promises").readFile;
let unlink: typeof import("fs/promises").unlink;
let rm: typeof import("fs/promises").rm;
let mkdir: typeof import("fs/promises").mkdir;
let existsSync: typeof import("fs").existsSync;
let join: typeof import("path").join;
let tmpdir: typeof import("os").tmpdir;

// Initialize server-only modules
async function initializeServerModules() {
  if (!ffmpeg) {
    const fluentFfmpeg = await import("fluent-ffmpeg");
    ffmpeg = fluentFfmpeg.default;

    // Import platform-specific binaries for Vercel/Linux
    // In production (Vercel), use linux-x64 binaries
    // In development, use the auto-detected platform binaries
    if (process.env.VERCEL || process.platform === "linux") {
      console.log("[Video Composition] Loading linux-x64 binaries for Vercel");
      // @ts-expect-error - linux-x64 packages don't have TypeScript definitions
      const ffmpegInstaller = await import("@ffmpeg-installer/linux-x64");
      ffmpegPath = ffmpegInstaller.default;

      // @ts-expect-error - linux-x64 packages don't have TypeScript definitions
      const ffprobeInstaller = await import("@ffprobe-installer/linux-x64");
      ffprobePath = ffprobeInstaller.default;
    } else {
      console.log("[Video Composition] Loading platform-auto-detected binaries");
      const ffmpegInstaller = await import("@ffmpeg-installer/ffmpeg");
      ffmpegPath = ffmpegInstaller.default;

      const ffprobeInstaller = await import("@ffprobe-installer/ffprobe");
      ffprobePath = ffprobeInstaller.default;
    }

    const fsPromises = await import("fs/promises");
    writeFile = fsPromises.writeFile;
    readFile = fsPromises.readFile;
    unlink = fsPromises.unlink;
    rm = fsPromises.rm;
    mkdir = fsPromises.mkdir;

    const fs = await import("fs");
    existsSync = fs.existsSync;

    const pathModule = await import("path");
    join = pathModule.join;

    const osModule = await import("os");
    tmpdir = osModule.tmpdir;

    // Configure FFmpeg and FFprobe paths
    console.log("[Video Composition] FFmpeg path:", ffmpegPath.path);
    console.log("[Video Composition] FFprobe path:", ffprobePath.path);
    ffmpeg.setFfmpegPath(ffmpegPath.path);
    ffmpeg.setFfprobePath(ffprobePath.path);
  }
}

// ============================================================================
// Main Composition Functions
// ============================================================================

/**
 * Combine multiple room videos into a final video with overlays
 */
export async function combineRoomVideos(
  roomVideoUrls: string[],
  compositionSettings: VideoCompositionSettings,
  userId: string,
  projectId: string,
  finalVideoId: string,
  projectName?: string
): Promise<ComposedVideoResult> {
  // Initialize server modules
  await initializeServerModules();

  const tempDir = join(tmpdir(), `video-composition-${projectId}-${Date.now()}`);
  const tempFiles: string[] = [];

  try {
    // Create temp directory
    if (!existsSync(tempDir)) {
      await mkdir(tempDir, { recursive: true });
    }

    console.log(
      `[Video Composition] Starting composition for ${roomVideoUrls.length} room videos`
    );

    // Step 1: Download all room videos to temp directory
    const downloadedVideos = await downloadRoomVideosToTemp(
      roomVideoUrls,
      tempDir
    );
    tempFiles.push(...downloadedVideos);

    // Step 2: Concatenate videos with transitions
    const concatenatedPath = join(tempDir, "concatenated.mp4");
    await concatenateVideos(
      downloadedVideos,
      concatenatedPath,
      compositionSettings.transitions
    );
    tempFiles.push(concatenatedPath);

    let finalVideoPath = concatenatedPath;

    // Step 3: Apply logo overlay if provided
    if (compositionSettings.logo) {
      const logoPath = join(tempDir, "logo.png");
      await saveLogoToTemp(compositionSettings.logo.file, logoPath);
      tempFiles.push(logoPath);

      const videoWithLogoPath = join(tempDir, "with_logo.mp4");
      await applyLogoOverlay(
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
      await generateSubtitleFile(
        compositionSettings.subtitles.text,
        subtitlesPath,
        await getVideoDuration(finalVideoPath)
      );
      tempFiles.push(subtitlesPath);

      const videoWithSubsPath = join(tempDir, "with_subtitles.mp4");
      await applySubtitles(
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
    await generateThumbnail(finalVideoPath, thumbnailPath);
    tempFiles.push(thumbnailPath);

    // Step 6: Read final video and thumbnail as blobs
    const videoBuffer = await readFile(finalVideoPath);
    const videoBlob = new Blob([new Uint8Array(videoBuffer)], { type: "video/mp4" });

    const thumbnailBuffer = await readFile(thumbnailPath);
    const thumbnailBlob = new Blob([new Uint8Array(thumbnailBuffer)], { type: "image/jpeg" });

    // Step 7: Upload to storage
    console.log("[Video Composition] Uploading final video and thumbnail");
    const [videoUrl, thumbnailUrl] = await Promise.all([
      uploadFinalVideo(videoBlob, userId, finalVideoId, projectName),
      uploadThumbnail(thumbnailBlob, userId, finalVideoId)
    ]);

    // Get video metadata
    const duration = await getVideoDuration(finalVideoPath);

    console.log("[Video Composition] Composition complete");

    return {
      videoUrl,
      thumbnailUrl,
      duration,
      fileSize: videoBuffer.length
    };
  } catch (error) {
    console.error("[Video Composition] Error during composition:", error);
    throw new Error(
      `Failed to compose video: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  } finally {
    // Cleanup temp files
    await cleanupTempFiles(tempFiles);
    // Cleanup temp directory
    try {
      await rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`Failed to cleanup temp directory ${tempDir}:`, error);
      // Ignore cleanup errors
    }
  }
}

// ============================================================================
// Video Download & Preparation
// ============================================================================

/**
 * Download room videos to temporary directory
 */
async function downloadRoomVideosToTemp(
  videoUrls: string[],
  tempDir: string
): Promise<string[]> {
  console.log(
    `[Video Composition] Downloading ${videoUrls.length} room videos`
  );

  const downloadPromises = videoUrls.map(async (url, index) => {
    const videoBlob = await downloadVideoFromUrl(url);
    const videoPath = join(tempDir, `room_${index}.mp4`);
    const buffer = Buffer.from(await videoBlob.arrayBuffer());
    await writeFile(videoPath, buffer);
    return videoPath;
  });

  return await Promise.all(downloadPromises);
}

// ============================================================================
// Video Concatenation
// ============================================================================

/**
 * Concatenate multiple videos with optional transitions
 */
async function concatenateVideos(
  videoPaths: string[],
  outputPath: string,
  withTransitions: boolean
): Promise<void> {
  console.log(
    `[Video Composition] Concatenating ${videoPaths.length} videos`
  );

  // Special case: single video - just re-encode without filters
  if (videoPaths.length === 1) {
    return new Promise((resolve, reject) => {
      const command = ffmpeg();
      command
        .input(videoPaths[0])
        .outputOptions([
          "-c:v libx264",
          "-preset medium",
          "-crf 23",
          "-y" // Overwrite output file
        ])
        .output(outputPath)
        .on("start", (cmd) => {
          console.log("[FFmpeg] Re-encoding single video:", cmd);
          console.log("[FFmpeg] Output path:", outputPath);
        })
        .on("progress", (progress) => {
          if (progress.percent) {
            console.log(
              `[FFmpeg] Re-encoding progress: ${Math.round(progress.percent)}%`
            );
          }
        })
        .on("end", () => {
          console.log("[FFmpeg] Re-encoding complete");
          resolve();
        })
        .on("error", (err, stdout, stderr) => {
          console.error("[FFmpeg] Re-encoding error:", err);
          console.error("[FFmpeg] stdout:", stdout);
          console.error("[FFmpeg] stderr:", stderr);
          reject(err);
        })
        .run();
    });
  }

  // Multiple videos: get durations and metadata first if using transitions
  let videoDurations: number[] = [];
  if (withTransitions) {
    console.log("[Video Composition] Getting video durations for transition offsets");
    videoDurations = await Promise.all(
      videoPaths.map((path) => getVideoDuration(path))
    );
    console.log("[Video Composition] Video durations:", videoDurations);

    // Get metadata for first video to debug
    try {
      const metadata = await getVideoMetadata(videoPaths[0]);
      console.log("[Video Composition] First video metadata:", {
        duration: metadata.format.duration,
        width: metadata.streams[0]?.width,
        height: metadata.streams[0]?.height,
        fps: metadata.streams[0]?.r_frame_rate,
        codec: metadata.streams[0]?.codec_name
      });
    } catch (err) {
      console.error("[Video Composition] Error getting metadata:", err);
    }
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg();

    // Multiple videos: use complex filter for concatenation
    videoPaths.forEach((path) => {
      command.input(path);
    });

    const filterComplex = withTransitions
      ? buildTransitionFilter(videoPaths.length, videoDurations)
      : buildSimpleConcatFilter(videoPaths.length);

    command
      .complexFilter(filterComplex)
      .outputOptions([
        "-map [outv]", // Map the output from the filter
        "-c:v libx264",
        "-preset medium",
        "-crf 23",
        "-y" // Overwrite output file
      ])
      .output(outputPath)
      .on("start", (cmd) => {
        console.log("[FFmpeg] Concatenation started:", cmd);
        console.log("[FFmpeg] Output path:", outputPath);
      })
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(
            `[FFmpeg] Concatenation progress: ${Math.round(progress.percent)}%`
          );
        }
      })
      .on("end", () => {
        console.log("[FFmpeg] Concatenation complete");
        resolve();
      })
      .on("error", (err, stdout, stderr) => {
        console.error("[FFmpeg] Concatenation error:", err);
        console.error("[FFmpeg] stdout:", stdout);
        console.error("[FFmpeg] stderr:", stderr);
        reject(err);
      })
      .run();
  });
}

/**
 * Build simple concatenation filter (no transitions, video only)
 */
function buildSimpleConcatFilter(videoCount: number): string {
  const inputs = Array.from({ length: videoCount }, (_, i) => `[${i}:v]`).join("");
  return `${inputs}concat=n=${videoCount}:v=1:a=0[outv]`;
}

/**
 * Build concatenation filter with crossfade transitions (video only)
 *
 * IMPORTANT: xfade requires very specific handling:
 * - Both inputs must have the same resolution, frame rate, and pixel format
 * - The first input must be padded to extend beyond the offset point
 * - For offset calculation: offset should be where we want the transition to START
 */
function buildTransitionFilter(videoCount: number, videoDurations: number[]): string {
  // Note: single video case is handled separately in concatenateVideos()
  // so this should never receive videoCount === 1

  const fadeDuration = 0.5; // 0.5 second crossfade

  // Special case for 2 videos - use the proven working filter
  if (videoCount === 2) {
    const offset = videoDurations[0] - fadeDuration;

    console.log(`[Video Composition] Building xfade filter for 2 videos`);
    console.log(`[Video Composition] Video 0 duration: ${videoDurations[0]}s`);
    console.log(`[Video Composition] Video 1 duration: ${videoDurations[1]}s`);
    console.log(`[Video Composition] Fade duration: ${fadeDuration}s`);
    console.log(`[Video Composition] Calculated offset: ${offset}s`);
    console.log(`[Video Composition] Expected output duration: ~${offset + videoDurations[1]}s`);

    // WORKING FILTER: Normalize both inputs, apply xfade, then format output
    const filter = `[0:v]format=yuv420p,fps=30,scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1[v0];[1:v]format=yuv420p,fps=30,scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1[v1];[v0][v1]xfade=transition=fade:duration=${fadeDuration}:offset=${offset},format=yuv420p[outv]`;
    console.log(`[Video Composition] Filter command: ${filter}`);
    return filter;
  }

  // For 3+ videos: try to extend the 2-video approach
  console.log(`[Video Composition] Building xfade filter for ${videoCount} videos`);
  console.log(`[Video Composition] Video durations:`, videoDurations);
  console.log(`[Video Composition] Fade duration: ${fadeDuration}s`);

  const filters: string[] = [];

  // First, normalize all inputs to same format, fps, scale, and aspect ratio
  for (let i = 0; i < videoCount; i++) {
    filters.push(`[${i}:v]format=yuv420p,fps=30,scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1[v${i}]`);
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
      // For chained xfades, calculate accumulated duration
      const accumulatedDuration = videoDurations.slice(0, i + 1).reduce((a, b) => a + b, 0) - (i * fadeDuration);
      offset = accumulatedDuration - fadeDuration;
    }

    console.log(`[Video Composition] Xfade ${i}: [${input1}][${input2}] -> [${output}], offset: ${offset}s`);

    // For the last xfade, add format=yuv420p like in the 2-video case
    if (isLast) {
      filters.push(`[${input1}][${input2}]xfade=transition=fade:duration=${fadeDuration}:offset=${offset},format=yuv420p[${output}]`);
    } else {
      filters.push(`[${input1}][${input2}]xfade=transition=fade:duration=${fadeDuration}:offset=${offset}[${output}]`);
    }
  }

  const finalFilter = filters.join(";");
  console.log(`[Video Composition] Complete filter: ${finalFilter}`);
  return finalFilter;
}

// ============================================================================
// Logo Overlay
// ============================================================================

/**
 * Save logo file to temp directory
 */
async function saveLogoToTemp(logoFile: File | Blob, logoPath: string): Promise<void> {
  const buffer = Buffer.from(await logoFile.arrayBuffer());
  await writeFile(logoPath, buffer);
}

/**
 * Apply logo overlay to video
 */
async function applyLogoOverlay(
  videoPath: string,
  logoPath: string,
  outputPath: string,
  position: LogoPosition
): Promise<void> {
  console.log(`[Video Composition] Applying logo overlay at ${position}`);

  return new Promise((resolve, reject) => {
    const overlayPosition = getLogoOverlayPosition(position);

    ffmpeg(videoPath)
      .input(logoPath)
      .complexFilter([
        // Resize logo to max 500x500 while maintaining aspect ratio
        "[1:v]scale='min(500,iw)':'min(500,ih)':force_original_aspect_ratio=decrease[logo]",
        // Overlay at specified position with 20px padding
        `[0:v][logo]overlay=${overlayPosition}[outv]`
      ])
      .outputOptions(["-c:v libx264", "-preset medium", "-crf 23"])
      .output(outputPath)
      .on("start", (cmd) => {
        console.log("[FFmpeg] Logo overlay started:", cmd);
      })
      .on("end", () => {
        console.log("[FFmpeg] Logo overlay complete");
        resolve();
      })
      .on("error", (err) => {
        console.error("[FFmpeg] Logo overlay error:", err);
        reject(err);
      })
      .run();
  });
}

/**
 * Get FFmpeg overlay position string for logo
 */
function getLogoOverlayPosition(position: LogoPosition): string {
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
async function generateSubtitleFile(
  text: string,
  subtitlesPath: string,
  videoDuration: number
): Promise<void> {
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
          endTime: Math.min(currentStartTime + secondsPerSubtitle, videoDuration),
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
      const start = formatSrtTime(sub.startTime);
      const end = formatSrtTime(sub.endTime);
      return `${index + 1}\n${start} --> ${end}\n${sub.text}\n`;
    })
    .join("\n");

  await writeFile(subtitlesPath, srtContent, "utf-8");
}

/**
 * Format time in SRT format (HH:MM:SS,mmm)
 */
function formatSrtTime(seconds: number): string {
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
async function applySubtitles(
  videoPath: string,
  subtitlesPath: string,
  outputPath: string,
  font: string = "Arial"
): Promise<void> {
  console.log("[Video Composition] Applying subtitles");

  return new Promise((resolve, reject) => {
    // Escape the subtitles path for FFmpeg filter
    const escapedSubPath = subtitlesPath.replace(/\\/g, "/").replace(/:/g, "\\:");

    ffmpeg(videoPath)
      .outputOptions([
        "-c:v libx264",
        "-preset medium",
        "-crf 23",
        `-vf subtitles=${escapedSubPath}:force_style='FontName=${font},FontSize=24,PrimaryColour=&HFFFFFF,OutlineColour=&H000000,Outline=2'`
      ])
      .output(outputPath)
      .on("start", (cmd) => {
        console.log("[FFmpeg] Subtitle overlay started:", cmd);
      })
      .on("end", () => {
        console.log("[FFmpeg] Subtitle overlay complete");
        resolve();
      })
      .on("error", (err) => {
        console.error("[FFmpeg] Subtitle overlay error:", err);
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
export async function generateThumbnail(
  videoPath: string,
  outputPath?: string
): Promise<string> {
  // Initialize server modules
  await initializeServerModules();

  const thumbnailPath = outputPath || join(tmpdir(), `thumbnail-${Date.now()}.jpg`);

  console.log("[Video Composition] Generating thumbnail");
  console.log("[Video Composition] Thumbnail output path:", thumbnailPath);

  return new Promise((resolve, reject) => {
    // Use outputOptions method instead of screenshots for better control
    ffmpeg(videoPath)
      .inputOptions(["-ss 00:00:00.000"]) // Seek to first frame
      .outputOptions([
        "-frames:v 1", // Extract 1 frame
        "-q:v 2", // Quality level (1-31, lower is better)
        "-y" // Overwrite output file
      ])
      .output(thumbnailPath)
      .on("start", (cmd) => {
        console.log("[FFmpeg] Thumbnail generation started:", cmd);
      })
      .on("end", () => {
        console.log("[FFmpeg] Thumbnail generated");
        resolve(thumbnailPath);
      })
      .on("error", (err, stdout, stderr) => {
        console.error("[FFmpeg] Thumbnail generation error:", err);
        console.error("[FFmpeg] stdout:", stdout);
        console.error("[FFmpeg] stderr:", stderr);
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
async function getVideoDuration(videoPath: string): Promise<number> {
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
 * Get full video metadata
 */
async function getVideoMetadata(videoPath: string): Promise<import("fluent-ffmpeg").FfprobeData> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) {
        reject(err);
      } else {
        resolve(metadata);
      }
    });
  });
}

/**
 * Clean up temporary files
 */
async function cleanupTempFiles(filePaths: string[]): Promise<void> {
  const deletePromises = filePaths.map((path) =>
    unlink(path).catch((err) => {
      console.warn(`Failed to delete temp file ${path}:`, err);
    })
  );

  await Promise.all(deletePromises);
  console.log(`[Video Composition] Cleaned up ${filePaths.length} temp files`);
}
