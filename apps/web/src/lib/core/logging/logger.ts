import { createLogger, createChildLogger } from "@shared/utils/logger";
import { getCallContext } from "@web/src/server/infra/logger/callContext";
import {
  getStructuredStackFrames,
  mapToOriginalSource,
  normalizeStackFileName,
  toAbsoluteFileUri
} from "@web/src/server/infra/logger/stackSource";

const isDev = process.env.NODE_ENV === "development";
const includeActionURI = isDev && process.env.LOG_INCLUDE_ACTION_URI === "true";
const includeInvokedByURI =
  isDev && process.env.LOG_INCLUDE_INVOKEDBY_URI === "true";
const actionUriFrameSkipPaths = [
  "/apps/web/src/lib/core/logging/logger.ts",
  "/packages/shared/utils/logger.ts",
  "/apps/web/src/server/models/shared/dbErrorHandling.ts",
  "/apps/web/src/server/services/roomClassification/retry.ts"
];

function shouldSkipActionUriFrame(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  if (
    normalized.includes("/node_modules/pino/") ||
    normalized.includes("node:internal")
  ) {
    return true;
  }
  return actionUriFrameSkipPaths.some((skipPath) =>
    normalized.includes(skipPath)
  );
}

function getActionURI(): string | undefined {
  try {
    const frames = getStructuredStackFrames();
    for (let i = 1; i < frames.length; i += 1) {
      const frame = frames[i];
      const rawFile = frame?.getFileName();
      if (!rawFile) continue;
      if (shouldSkipActionUriFrame(rawFile)) {
        continue;
      }

      let filePath = normalizeStackFileName(rawFile);
      const line = frame.getLineNumber() ?? 1;
      const column = frame.getColumnNumber() ?? 1;
      filePath = mapToOriginalSource(filePath, line, column);
      if (shouldSkipActionUriFrame(filePath)) {
        continue;
      }

      return toAbsoluteFileUri(filePath);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Shared logger instance for the Next.js web server
 * Uses the shared logger configuration from @shared/utils/logger
 * Injects invokedBy and requestId from AsyncLocalStorage into every log
 */
export const logger = createLogger({
  service: "zencourt-web",
  includeDefaultBaseFields: false,
  contextMixin: () => {
    const ctx = getCallContext();
    const actionURI = includeActionURI ? getActionURI() : undefined;
    return ctx
      ? {
          invokedBy: ctx.caller,
          ...(actionURI && { actionURI }),
          ...(includeInvokedByURI &&
            ctx.callerURI && { invokedByURI: ctx.callerURI }),
          ...(ctx.requestId && { requestId: ctx.requestId })
        }
      : {};
  }
});

export { createChildLogger };
export default logger;
