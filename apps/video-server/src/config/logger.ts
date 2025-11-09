import { createLogger } from "@shared/utils/logger";
import { env } from "./env";

/**
 * Shared logger instance for the video processing server
 * Uses the shared logger configuration from @shared/utils/logger
 */
export const logger = createLogger({
  service: "zencourt-video-server",
  level: env.logLevel
});

export default logger;
