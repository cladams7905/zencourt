import sharp from "sharp";
import logger from "@/config/logger";
import { storageService } from "@/services/storage";
import { getVideoJobFolder } from "@shared/utils";
import { downloadBufferWithRetry } from "./downloadWithRetry";
import type { GENERATION_MODELS, VideoOrientation } from "@shared/types/models";

type ProviderSourceImageSize = {
  width: number;
  height: number;
};

type PrepareProviderSourceImageInput = {
  imageUrl: string;
  userId: string;
  listingId: string;
  videoId: string;
  jobId: string;
  targetSize: ProviderSourceImageSize;
};

type PrepareProviderSourceImageDeps = {
  downloadBuffer: typeof downloadBufferWithRetry;
  uploadFile: typeof storageService.uploadFile;
};

const ASPECT_RATIO_TOLERANCE = 0.01;

export function resolveProviderSourceImageSize(args: {
  model?: GENERATION_MODELS;
  orientation: VideoOrientation;
}): ProviderSourceImageSize {
  const model = args.model ?? "veo3.1_fast";

  if (model === "veo3.1_fast") {
    return { width: 1920, height: 1080 };
  }

  return args.orientation === "vertical"
    ? { width: 1080, height: 1920 }
    : { width: 1920, height: 1080 };
}

function aspectRatioMatches(args: {
  width: number;
  height: number;
  targetSize: ProviderSourceImageSize;
}): boolean {
  const sourceRatio = args.width / args.height;
  const targetRatio = args.targetSize.width / args.targetSize.height;
  return Math.abs(sourceRatio - targetRatio) <= ASPECT_RATIO_TOLERANCE;
}

export async function prepareProviderSourceImage(
  input: PrepareProviderSourceImageInput,
  deps: PrepareProviderSourceImageDeps = {
    downloadBuffer: downloadBufferWithRetry,
    uploadFile: storageService.uploadFile.bind(storageService)
  }
): Promise<string> {
  try {
    const { buffer } = await deps.downloadBuffer({
      url: input.imageUrl,
      timeout: 60_000,
      validateSize: false
    });

    const sourceImage = sharp(buffer, { failOn: "none" }).rotate();
    const metadata = await sourceImage.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Source image dimensions are unavailable");
    }

    if (
      aspectRatioMatches({
        width: metadata.width,
        height: metadata.height,
        targetSize: input.targetSize
      })
    ) {
      return input.imageUrl;
    }

    const normalizedBuffer = await sourceImage
      .resize(input.targetSize.width, input.targetSize.height, {
        fit: "cover",
        position: "centre"
      })
      .jpeg({ quality: 90 })
      .toBuffer();

    const key = `${getVideoJobFolder(
      input.userId,
      input.listingId,
      input.videoId,
      input.jobId
    )}/source-${input.targetSize.width}x${input.targetSize.height}.jpg`;

    return deps.uploadFile({
      key,
      body: normalizedBuffer,
      contentType: "image/jpeg"
    });
  } catch (error) {
    logger.warn(
      {
        imageUrl: input.imageUrl,
        jobId: input.jobId,
        error: error instanceof Error ? error.message : String(error)
      },
      "[VideoGenerationService] Failed to prepare provider source image, using original"
    );
    return input.imageUrl;
  }
}
