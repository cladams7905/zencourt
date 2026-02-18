import { DrizzleError } from "drizzle-orm";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/core/logging/logger";

const logger = createChildLogger(baseLogger, { module: "server-actions" });

export interface DbActionOptions {
  actionName: string;
  context?: Record<string, unknown>;
  errorMessage?: string;
}

export async function withDbErrorHandling<T>(
  fn: () => Promise<T>,
  options: DbActionOptions
): Promise<T> {
  const {
    actionName,
    context = {},
    errorMessage = "Database operation failed. Please try again."
  } = options;
  const startTime = Date.now();

  try {
    logger.debug({ action: actionName, ...context }, `Starting ${actionName}`);

    const result = await fn();

    const duration = Date.now() - startTime;
    logger.info(
      { action: actionName, duration, ...context },
      `Successfully completed ${actionName}`
    );

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error instanceof DrizzleError) {
      logger.error(
        {
          action: actionName,
          duration,
          error: error.message,
          cause: error.cause,
          ...context
        },
        `Database error in ${actionName}`
      );
      throw new Error(errorMessage);
    }

    if (error instanceof Error) {
      logger.error(
        {
          action: actionName,
          duration,
          error: error.message,
          ...context
        },
        `Error in ${actionName}`
      );
      throw error;
    }

    logger.error(
      { action: actionName, duration, error, ...context },
      `Unexpected error in ${actionName}`
    );
    throw new Error("An unexpected error occurred");
  }
}
