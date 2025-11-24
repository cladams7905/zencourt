import pino from "pino";

/**
 * Options for creating a logger instance
 */
export interface LoggerOptions {
  /**
   * Service name to include in all log entries
   */
  service: string;

  /**
   * Log level (default: info in production, debug in development)
   */
  level?: string;

  /**
   * Additional base properties to include in all log entries
   */
  base?: Record<string, unknown>;
}

/**
 * Create a Pino logger instance configured for the Zencourt monorepo
 *
 * Features:
 * - Structured JSON logging in production
 * - Pretty-printed output in development
 * - ISO timestamps
 * - Service name tagging
 * - Configurable log level via LOG_LEVEL env var or options
 *
 * @param options - Logger configuration options
 * @returns Configured Pino logger instance
 *
 * @example
 * ```typescript
 * // In Express server
 * import { createLogger } from '@shared/utils/logger';
 * export const logger = createLogger({ service: 'video-server' });
 *
 * // In Next.js server
 * import { createLogger } from '@shared/utils/logger';
 * export const logger = createLogger({ service: 'web-server' });
 * ```
 */
export function createLogger(options: LoggerOptions): pino.Logger {
  const { service, level, base = {} } = options;
  const nodeEnv = process.env.NODE_ENV || "development";
  const isDevelopment = nodeEnv === "development";
  const logLevel =
    level || process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

  return pino({
    level: logLevel,

    // Standard formatters
    formatters: {
      level: (label) => ({ level: label })
    },

    // ISO timestamps for consistency
    timestamp: pino.stdTimeFunctions.isoTime,

    // Base context included in all logs
    base: {
      service,
      env: nodeEnv,
      ...base
    },

    // Pretty printing in development for readability
    transport: isDevelopment
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss Z",
            ignore: "pid,hostname"
          }
        }
      : undefined
  });
}

/**
 * Create a child logger with additional context
 *
 * @param parentLogger - The parent logger instance
 * @param context - Additional context to add to all log messages from this child
 * @returns Child logger with bound context
 *
 * @example
 * ```typescript
 * const logger = createLogger({ service: 'web-server' });
 * const requestLogger = createChildLogger(logger, { requestId: '123', userId: '456' });
 * requestLogger.info('Processing request'); // Will include requestId and userId
 * ```
 */
export function createChildLogger(
  parentLogger: pino.Logger,
  context: Record<string, unknown>
): pino.Logger {
  return parentLogger.child(context);
}
