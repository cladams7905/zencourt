import { createLogger, createChildLogger } from "@shared/utils/logger";

/**
 * Shared logger instance for the Next.js web server
 * Uses the shared logger configuration from @shared/utils/logger
 */
export const logger = createLogger({
  service: "zencourt-web"
});

export { createChildLogger };
export default logger;
