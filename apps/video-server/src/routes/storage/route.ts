import express, { Request, Response, Router } from "express";
import multer from "multer";
import { validateApiKey } from "@/middleware/auth";
import { asyncHandler } from "@/middleware/errorHandler";
import { storageService } from "@/services/storageService";
import {
  parseBatchUploadRouteInput,
  parseDeleteRouteInput,
  parseSignedUrlRouteInput,
  parseUploadRouteInput
} from "@/routes/storage/domain/requests";
import {
  handleBatchUpload,
  handleDeleteByUrl,
  handleSignedUrlRequest,
  handleSingleUpload
} from "@/routes/storage/orchestrators/handlers";
import {
  VideoProcessingError,
  VideoProcessingErrorType
} from "@/middleware/errorHandler";

const router: Router = express.Router();

const allowedMimes = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
  "video/quicktime"
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(
      new VideoProcessingError(
        `Invalid file type: ${
          file.mimetype
        }. Allowed types: ${allowedMimes.join(", ")}`,
        VideoProcessingErrorType.INVALID_INPUT
      )
    );
  }
});

router.post(
  "/upload",
  validateApiKey,
  upload.single("file"),
  asyncHandler(async (req: Request, res: Response) => {
    const input = parseUploadRouteInput(req);
    const result = await handleSingleUpload(input, storageService);
    res.status(200).json(result);
  })
);

router.delete(
  "/delete",
  validateApiKey,
  asyncHandler(async (req: Request, res: Response) => {
    const { url } = parseDeleteRouteInput(req.body);
    const result = await handleDeleteByUrl(url, storageService);
    res.status(200).json(result);
  })
);

router.post(
  "/signed-url",
  validateApiKey,
  asyncHandler(async (req: Request, res: Response) => {
    const { key, expiresIn } = parseSignedUrlRouteInput(req.body);
    const result = await handleSignedUrlRequest(key, expiresIn, storageService);
    res.status(200).json(result);
  })
);

router.post(
  "/batch",
  validateApiKey,
  upload.array("files", 50),
  asyncHandler(async (req: Request, res: Response) => {
    const input = parseBatchUploadRouteInput(req);
    const result = await handleBatchUpload(input, storageService);
    res.status(200).json(result);
  })
);

export default router;
