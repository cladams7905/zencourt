import { DrizzleError } from "drizzle-orm";
import { createChildLogger, logger as baseLogger } from "../lib/logger";

const logger = createChildLogger(baseLogger, { module: "server-actions" });

/**
 * Options for wrapping a database action
 */
export interface DbActionOptions {
  /**
   * Name of the action for logging purposes
   */
  actionName: string;

  /**
   * Context to include in logs (e.g., { projectId, userId })
   */
  context?: Record<string, unknown>;

  /**
   * Custom error message for database errors
   * @default "Database operation failed. Please try again."
   */
  errorMessage?: string;
}

/**
 * Wraps a database operation with error handling and logging
 *
 * Provides consistent error handling for all database operations:
 * - Catches DrizzleError and logs with context
 * - Provides user-friendly error messages
 * - Logs successful operations with timing
 * - Re-throws validation errors as-is
 *
 * @param fn - The database operation to execute
 * @param options - Configuration options
 * @returns The result of the database operation
 * @throws Error with user-friendly message if operation fails
 *
 * @example
 * ```typescript
 * export async function saveImages(projectId: string, imageData: InsertDBImage[]) {
 *   // Validate inputs first
 *   if (!projectId) throw new Error("Project ID is required");
 *
 *   return withDbErrorHandling(
 *     async () => {
 *       const savedImages = await db
 *         .insert(images)
 *         .values(imageData)
 *         .returning();
 *       return savedImages;
 *     },
 *     {
 *       actionName: "saveImages",
 *       context: { projectId, imageCount: imageData.length },
 *       errorMessage: "Failed to save images to database"
 *     }
 *   );
 * }
 * ```
 */
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

    // Drizzle database errors
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

    // Re-throw validation errors or other known errors as-is
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

    // Unexpected error type
    logger.error(
      { action: actionName, duration, error, ...context },
      `Unexpected error in ${actionName}`
    );
    throw new Error("An unexpected error occurred");
  }
}
