/**
 * Authentication middleware for API requests
 * Validates X-API-Key header against configured VIDEO_SERVER_API_KEY
 */

import { Request, Response, NextFunction } from 'express';
import logger from '@/config/logger';

/**
 * Middleware to validate API key from X-API-Key header
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  //C: We should not be handing have one single api key for the entire server what
  //C: This is inherently insecure
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!apiKey) {
    logger.warn(
      {
        method: req.method,
        url: req.url,
        ip: req.ip,
      },
      'Missing X-API-Key header'
    );

    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing X-API-Key header',
    });
    return;
  }

  if (apiKey !== process.env.VIDEO_SERVER_API_KEY) {
    logger.warn(
      {
        method: req.method,
        url: req.url,
        ip: req.ip,
      },
      'Invalid API key'
    );

    res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
    return;
  }

  // API key is valid, proceed to next middleware
  next();
}
