/**
 * Authentication middleware for API requests
 * Validates X-API-Key header against configured VIDEO_SERVER_API_KEY
 */

import { Request, Response, NextFunction } from 'express';
import { timingSafeEqual } from "crypto";
import logger from '@/config/logger';

function getHeaderValue(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function secureEqual(value: string, expected: string): boolean {
  const valueBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  if (valueBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(valueBuffer, expectedBuffer);
}

function parseClientKeys(envValue: string | undefined): Map<string, string> {
  const map = new Map<string, string>();
  if (!envValue) return map;
  for (const pair of envValue.split(",")) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex <= 0) {
      continue;
    }
    const clientId = trimmed.slice(0, separatorIndex).trim();
    const key = trimmed.slice(separatorIndex + 1).trim();
    if (clientId && key) {
      map.set(clientId, key);
    }
  }
  return map;
}

function rejectUnauthorized(req: Request, res: Response, reason: string): void {
  logger.warn(
    {
      method: req.method,
      url: req.url,
      ip: req.ip,
      reason
    },
    "API authentication failed"
  );

  res.status(401).json({
    success: false,
    error: "Unauthorized",
    message: "Unauthorized"
  });
}

/**
 * Middleware to validate API key from X-API-Key header
 */
export function validateApiKey(req: Request, res: Response, next: NextFunction): void {
  const apiKey = getHeaderValue(req.headers["x-api-key"]);
  const clientId = getHeaderValue(req.headers["x-client-id"]);
  const perClientKeys = parseClientKeys(process.env.VIDEO_SERVER_CLIENT_KEYS);
  const legacyKey = process.env.VIDEO_SERVER_API_KEY;

  if (!apiKey) {
    rejectUnauthorized(req, res, "missing_api_key");
    return;
  }

  if (perClientKeys.size > 0) {
    if (!clientId) {
      rejectUnauthorized(req, res, "missing_client_id");
      return;
    }
    const expectedKey = perClientKeys.get(clientId);
    if (!expectedKey || !secureEqual(apiKey, expectedKey)) {
      rejectUnauthorized(req, res, "invalid_client_credentials");
      return;
    }
    next();
    return;
  }

  if (!legacyKey || !secureEqual(apiKey, legacyKey)) {
    rejectUnauthorized(req, res, "invalid_legacy_key");
    return;
  }

  next();
}

export const authInternals = {
  parseClientKeys,
  secureEqual
};
