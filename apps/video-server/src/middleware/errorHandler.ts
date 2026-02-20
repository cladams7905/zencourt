/**
 * Error handling middleware and error classification
 */

import { Request, Response, NextFunction } from 'express';
import logger from '@/config/logger';

// ============================================================================
// Error Types and Classification
// ============================================================================

export enum VideoProcessingErrorType {
  // Storage Errors
  STORAGE_UPLOAD_FAILED = 'STORAGE_UPLOAD_FAILED',
  STORAGE_DOWNLOAD_FAILED = 'STORAGE_DOWNLOAD_FAILED',
  STORAGE_DELETE_FAILED = 'STORAGE_DELETE_FAILED',
  STORAGE_ACCESS_DENIED = 'STORAGE_ACCESS_DENIED',
  STORAGE_NOT_FOUND = 'STORAGE_NOT_FOUND',

  // FFmpeg Errors
  FFMPEG_NOT_FOUND = 'FFMPEG_NOT_FOUND',
  FFMPEG_PROCESS_FAILED = 'FFMPEG_PROCESS_FAILED',
  FFMPEG_TIMEOUT = 'FFMPEG_TIMEOUT',
  FFMPEG_INVALID_INPUT = 'FFMPEG_INVALID_INPUT',

  // fal.ai Errors
  FAL_SUBMISSION_FAILED = 'FAL_SUBMISSION_FAILED',
  FAL_GENERATION_FAILED = 'FAL_GENERATION_FAILED',

  // Job Errors
  JOB_TIMEOUT = 'JOB_TIMEOUT',
  JOB_NOT_FOUND = 'JOB_NOT_FOUND',

  // Webhook Errors
  WEBHOOK_DELIVERY_FAILED = 'WEBHOOK_DELIVERY_FAILED',
  WEBHOOK_INVALID_SIGNATURE = 'WEBHOOK_INVALID_SIGNATURE',

  // Validation Errors
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FILE_FORMAT = 'INVALID_FILE_FORMAT',

  // Authentication Errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  INVALID_API_KEY = 'INVALID_API_KEY',

  // General Errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

const retryableErrors: VideoProcessingErrorType[] = [
  VideoProcessingErrorType.STORAGE_UPLOAD_FAILED,
  VideoProcessingErrorType.STORAGE_DOWNLOAD_FAILED,
  VideoProcessingErrorType.WEBHOOK_DELIVERY_FAILED,
  VideoProcessingErrorType.FFMPEG_TIMEOUT,
  VideoProcessingErrorType.FAL_SUBMISSION_FAILED,
];

const statusMap: Partial<Record<VideoProcessingErrorType, number>> = {
  [VideoProcessingErrorType.UNAUTHORIZED]: 401,
  [VideoProcessingErrorType.INVALID_API_KEY]: 401,
  [VideoProcessingErrorType.INVALID_INPUT]: 400,
  [VideoProcessingErrorType.MISSING_REQUIRED_FIELD]: 400,
  [VideoProcessingErrorType.INVALID_FILE_FORMAT]: 400,
  [VideoProcessingErrorType.JOB_NOT_FOUND]: 404,
  [VideoProcessingErrorType.STORAGE_NOT_FOUND]: 404,
  [VideoProcessingErrorType.FAL_SUBMISSION_FAILED]: 503,
  [VideoProcessingErrorType.FAL_GENERATION_FAILED]: 500,
};

/**
 * Custom error class for video processing operations
 */
export class VideoProcessingError extends Error {
  public readonly type: VideoProcessingErrorType;
  public readonly retryable: boolean;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    type: VideoProcessingErrorType,
    options?: {
      retryable?: boolean;
      statusCode?: number;
      details?: unknown;
      context?: Record<string, unknown>;
    }
  ) {
    super(message);
    this.name = 'VideoProcessingError';
    this.type = type;
    this.retryable = options?.retryable ?? retryableErrors.includes(type);
    this.statusCode = options?.statusCode ?? statusMap[type] ?? 500;
    this.details = options?.details;
    this.context = options?.context;

    // Maintain proper stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format
   */
  toJSON() {
    return {
      success: false,
      error: this.statusCode >= 500 ? "Internal server error" : "Request failed",
      code: this.type,
      retryable: this.retryable,
    };
  }
}

// ============================================================================
// Error Handler Middleware
// ============================================================================

/**
 * Global error handler middleware
 * Handles all errors thrown in the application
 */
export function errorHandler(
  err: Error | VideoProcessingError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Extract error information
  const isVideoProcessingError = err instanceof VideoProcessingError;
  const statusCode = isVideoProcessingError ? err.statusCode : 500;
  const errorType = isVideoProcessingError ? err.type : VideoProcessingErrorType.UNKNOWN_ERROR;
  const retryable = isVideoProcessingError ? err.retryable : false;

  const isDevelopment = process.env.NODE_ENV === "development";

  // Log error with full context
  logger.error(
    {
      error: {
        name: err.name,
        message: err.message,
        type: errorType,
        retryable,
        stack: isDevelopment ? err.stack : undefined,
        details: isVideoProcessingError ? err.details : undefined,
        context: isVideoProcessingError ? err.context : undefined,
      },
      request: {
        method: req.method,
        url: req.url,
        path: req.path,
        headers: {
          'user-agent': req.get('user-agent'),
          'content-type': req.get('content-type'),
        },
        ip: req.ip,
        params: req.params,
        query: req.query,
      },
    },
    "Request error occurred"
  );

  const publicMessage = statusCode >= 500 ? "Internal server error" : "Request failed";

  // Send error response
  if (isVideoProcessingError) {
    res.status(statusCode).json({
      success: false,
      error: publicMessage,
      code: err.type,
      retryable: err.retryable
    });
  } else {
    res.status(statusCode).json({
      success: false,
      error: publicMessage,
      code: VideoProcessingErrorType.INTERNAL_ERROR,
      retryable: false,
    });
  }
}

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error handler
 */
export function asyncHandler<T>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Create a standardized error for common scenarios
 */
export const ErrorFactory = {
  unauthorized(message = 'Unauthorized'): VideoProcessingError {
    return new VideoProcessingError(message, VideoProcessingErrorType.UNAUTHORIZED, {
      statusCode: 401,
    });
  },

  invalidInput(message: string, details?: unknown): VideoProcessingError {
    return new VideoProcessingError(message, VideoProcessingErrorType.INVALID_INPUT, {
      statusCode: 400,
      details,
    });
  },

  notFound(resource: string): VideoProcessingError {
    return new VideoProcessingError(
      `${resource} not found`,
      VideoProcessingErrorType.JOB_NOT_FOUND,
      {
        statusCode: 404,
      }
    );
  },

  falSubmissionFailed(message: string, details?: unknown): VideoProcessingError {
    return new VideoProcessingError(
      message,
      VideoProcessingErrorType.FAL_SUBMISSION_FAILED,
      {
        statusCode: 503,
        details,
        retryable: true,
      }
    );
  },

  falGenerationFailed(message: string, details?: unknown): VideoProcessingError {
    return new VideoProcessingError(
      message,
      VideoProcessingErrorType.FAL_GENERATION_FAILED,
      {
        statusCode: 500,
        details,
        retryable: false,
      }
    );
  },
};
