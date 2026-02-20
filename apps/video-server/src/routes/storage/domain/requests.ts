import { Request } from "express";
import {
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";

export const DEFAULT_UPLOAD_FOLDER = "uploads";
export const DEFAULT_SIGNED_URL_EXPIRY = 3600;

export interface UploadRouteInput {
  file: Express.Multer.File;
  folder: string;
  userId?: string;
  listingId?: string;
  videoId?: string;
}

export interface BatchUploadRouteInput {
  files: Express.Multer.File[];
  folder: string;
  userId?: string;
  listingId?: string;
}

export function parseUploadRouteInput(req: Request): UploadRouteInput {
  const file = req.file;
  if (!file) {
    throw new VideoProcessingError(
      "No file provided in upload request",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }

  return {
    file,
    folder: (req.body.folder as string) || DEFAULT_UPLOAD_FOLDER,
    userId: req.body.userId as string | undefined,
    listingId: req.body.listingId as string | undefined,
    videoId: req.body.videoId as string | undefined
  };
}

export function parseDeleteRouteInput(body: unknown): { url: string } {
  const { url } = (body || {}) as { url?: string };
  if (!url || url.trim().length === 0) {
    throw new VideoProcessingError(
      "No URL provided in delete request",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
  return { url: url.trim() };
}

export function parseSignedUrlRouteInput(body: unknown): {
  key: string;
  expiresIn: number;
} {
  const { key, expiresIn } = (body || {}) as { key?: string; expiresIn?: number };
  if (!key || key.trim().length === 0) {
    throw new VideoProcessingError(
      "No key provided in signed-url request",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }
  return {
    key: key.trim(),
    expiresIn: expiresIn || DEFAULT_SIGNED_URL_EXPIRY
  };
}

export function parseBatchUploadRouteInput(req: Request): BatchUploadRouteInput {
  const files = req.files as Express.Multer.File[] | undefined;
  if (!files || files.length === 0) {
    throw new VideoProcessingError(
      "No files provided in batch upload request",
      VideoProcessingErrorType.INVALID_INPUT
    );
  }

  return {
    files,
    folder: (req.body.folder as string) || DEFAULT_UPLOAD_FOLDER,
    userId: req.body.userId as string | undefined,
    listingId: req.body.listingId as string | undefined
  };
}
