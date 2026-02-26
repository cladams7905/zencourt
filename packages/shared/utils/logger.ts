import pino from "pino";

type PrettyTransportTarget = NonNullable<
  NonNullable<Parameters<typeof pino>[0]>["transport"]
>;

declare global {
  var __zencourtPrettyTransport: PrettyTransportTarget | undefined;
}

function getPrettyTransportTarget(): PrettyTransportTarget {
  if (!globalThis.__zencourtPrettyTransport) {
    globalThis.__zencourtPrettyTransport = {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:hh:MM:ss TT",
        ignore: "pid,hostname",
        messageFormat: "{msg}"
      }
    };
  }

  return globalThis.__zencourtPrettyTransport;
}

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

  /**
   * Optional function called on every log to add dynamic context (e.g. invokedBy from AsyncLocalStorage).
   * Returned fields are merged into each log object.
   */
  contextMixin?: () => Record<string, unknown>;

  /**
   * Include default base metadata fields (`service`, `env`) in every log entry.
   * Defaults to true.
   */
  includeDefaultBaseFields?: boolean;
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
  const {
    service,
    level,
    base = {},
    contextMixin,
    includeDefaultBaseFields = true
  } = options;
  const nodeEnv = process.env.NODE_ENV || "development";
  const isDevelopment = nodeEnv === "development";
  const logLevel =
    level || process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info");

  return pino({
    level: logLevel,

    hooks: contextMixin
      ? {
          logMethod(inputArgs: unknown[], method: pino.LogFn, _level: number) {
            const mixinObj = contextMixin();
            const [first, ...rest] = inputArgs;
            let obj: Record<string, unknown>;

            if (
              typeof first === "object" &&
              first !== null &&
              !Array.isArray(first)
            ) {
              obj =
                Object.keys(mixinObj).length > 0
                  ? { ...(first as Record<string, unknown>), ...mixinObj }
                  : (first as Record<string, unknown>);
            } else {
              obj = Object.keys(mixinObj).length > 0 ? mixinObj : {};
            }

            const args =
              typeof first === "object" &&
              first !== null &&
              !Array.isArray(first)
                ? [obj, ...rest]
                : Object.keys(obj).length > 0
                  ? [obj, first, ...rest]
                  : (inputArgs as [unknown, ...unknown[]]);

            return (method as (...a: unknown[]) => void).apply(this, args);
          }
        }
      : undefined,

    // Standard formatters
    formatters: {
      level: (label) => ({ level: label })
    },

    // ISO timestamps for consistency
    timestamp: pino.stdTimeFunctions.isoTime,

    // Base context included in all logs
    base: includeDefaultBaseFields
      ? {
          service,
          env: nodeEnv,
          ...base
        }
      : base,

    // Pretty printing in development for readability
    transport: isDevelopment ? getPrettyTransportTarget() : undefined
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
