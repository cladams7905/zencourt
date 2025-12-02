import { createLogger } from "@shared/utils/logger";
import { Logger } from "pino";

/**
 * Shared logger instance for the video processing server
 * Uses the shared logger configuration from @shared/utils/logger
 */
export default createLogger({
  service: "zencourt-video-server",
  level: process.env.LOG_LEVEL
}) as Logger;
