import path from "node:path";
import { AsyncLocalStorage } from "async_hooks";
import {
  getStructuredStackFrames,
  mapToOriginalSource,
  normalizeStackFileName,
  toAbsoluteFileUri
} from "@web/src/server/infra/logger/stackSource";

export type CallContext = {
  caller: string;
  callerURI?: string;
  requestId?: string;
};

const callContextStorage = new AsyncLocalStorage<CallContext>();
const isDev = process.env.NODE_ENV === "development";

/**
 * Extract caller file path from stack, relative to workspace (process.cwd).
 * Skips the given number of frames to get the actual caller (e.g. skip 2 for runWithCaller).
 */
function getCallerFilePath(skipFrames: number): string {
  try {
    const frames = getStructuredStackFrames();
    for (let i = 1 + skipFrames; i < frames.length; i += 1) {
      const frame = frames[i];
      const rawFile = frame?.getFileName();
      if (!rawFile) continue;
      if (rawFile.includes("node:internal")) continue;
      if (
        rawFile
          .replace(/\\/g, "/")
          .endsWith("/src/server/infra/logger/callContext.ts")
      ) {
        continue;
      }

      let filePath = normalizeStackFileName(rawFile);
      const line = frame.getLineNumber() ?? 1;
      const column = frame.getColumnNumber() ?? 1;
      filePath = mapToOriginalSource(filePath, line, column);

      const relative = path.relative(process.cwd(), filePath) || filePath;
      const normalized = normalizeToSourcePath(relative);
      if (normalized.endsWith("src/server/infra/logger/callContext.ts"))
        continue;
      return normalized;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

/**
 * Best-effort mapping of compiled Next.js paths to workspace source paths.
 * .next/server/app/... -> src/app/..., .next/server/chunks with webpack:// -> extract source
 */
function normalizeToSourcePath(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  // .next/server/app/(dashboard)/page.js -> src/app/(dashboard)/page.tsx
  if (normalized.includes(".next/server/app/")) {
    const after = normalized.replace(/.*\.next\/server\/app\//, "src/app/");
    return after.replace(/\.js$/, ".tsx").replace(/\.mjs$/, ".tsx");
  }
  // .next/server/app-pages/ or similar
  if (normalized.includes(".next/server/")) {
    const after = normalized.replace(/.*\.next\/server\//, "");
    return after.replace(/\.js$/, ".tsx").replace(/\.mjs$/, ".ts");
  }
  // webpack://_N_E/./src/app/... or webpack-internal:///./src/...
  if (
    normalized.includes("webpack://") ||
    normalized.includes("webpack-internal:")
  ) {
    const match = normalized.match(
      /(?:webpack[^/]*\/\/[^/]*\/)?\.?\/?(src\/[^:?]+)/
    );
    if (match?.[1]) return match[1];
  }
  return filePath;
}

/**
 * Extract function name from caller (strip prefix).
 */
function getFunctionName(caller: string): string {
  return caller.includes(":") ? caller.slice(caller.indexOf(":") + 1) : caller;
}

function buildCallerContext(
  caller: string
): Pick<CallContext, "caller" | "callerURI"> {
  const fn = getFunctionName(caller);
  if (!isDev) return { caller: fn };
  const callerFilePath = getCallerFilePath(2);
  return {
    caller: fn,
    ...(callerFilePath !== "unknown" && {
      callerURI: toAbsoluteFileUri(callerFilePath)
    })
  };
}

/**
 * Runs fn with caller context stored in AsyncLocalStorage.
 * Downstream code can read the context via getCallContext() and include it in logs.
 * In dev, caller is appended with (path/to/file); in prod, caller string is used as-is.
 */
export function runWithCaller<T>(
  caller: string,
  fn: () => T | Promise<T>
): T | Promise<T>;
export function runWithCaller<T>(
  caller: string,
  requestId: string,
  fn: () => T | Promise<T>
): T | Promise<T>;
export function runWithCaller<T>(
  caller: string,
  requestIdOrFn: string | (() => T | Promise<T>),
  fn?: () => T | Promise<T>
): T | Promise<T> {
  const requestId =
    typeof requestIdOrFn === "string" ? requestIdOrFn : undefined;
  const actualFn =
    typeof requestIdOrFn === "function"
      ? requestIdOrFn
      : (fn as () => T | Promise<T>);
  const callerContext = buildCallerContext(caller);
  const context: CallContext = { ...callerContext, requestId };
  return callContextStorage.run(context, actualFn);
}

/**
 * Returns the current call context if set (caller and optional requestId).
 * Used by logging and auth to enrich log entries with traceability.
 */
export function getCallContext(): CallContext | undefined {
  return callContextStorage.getStore();
}

/**
 * Wraps a server action so it runs with caller context.
 * Use for exported server actions invoked from client/RSC.
 * In dev, caller is appended with (path/to/file) at wrap time.
 */
export function withServerActionCaller<A extends unknown[], R>(
  caller: string,
  fn: (...args: A) => Promise<R>
): (...args: A) => Promise<R> {
  return (...args: A) => runWithCaller(caller, () => fn(...args)) as Promise<R>;
}
