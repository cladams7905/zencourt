import pino from 'pino';
import { env } from './env';

/**
 * Create structured JSON logger using Pino
 * Logs to stdout with configurable log level
 */
export const logger = pino({
  level: env.logLevel,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'zencourt-video-processor',
    env: env.nodeEnv,
  },
  // In development, use pretty printing for readability
  transport:
    env.nodeEnv === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

export default logger;
