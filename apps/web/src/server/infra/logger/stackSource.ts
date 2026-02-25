import path from "node:path";
import { fileURLToPath, pathToFileURL, URL } from "node:url";
import { findSourceMap } from "node:module";

export type StackFrame = {
  getFileName(): string | null;
  getLineNumber(): number | null;
  getColumnNumber(): number | null;
};

export function getStructuredStackFrames(): StackFrame[] {
  const originalPrepare = Error.prepareStackTrace;
  try {
    Error.prepareStackTrace = (_error, stackTraces) => stackTraces;
    const stack = new Error().stack as unknown;
    return Array.isArray(stack) ? (stack as StackFrame[]) : [];
  } catch {
    return [];
  } finally {
    Error.prepareStackTrace = originalPrepare;
  }
}

export function normalizeStackFileName(fileName: string): string {
  return fileName.startsWith("file://") ? fileURLToPath(fileName) : fileName;
}

export function mapToOriginalSource(
  filePath: string,
  line: number,
  column: number
): string {
  try {
    const sourceMap = findSourceMap(filePath);
    if (!sourceMap) return filePath;
    const entry = sourceMap.findEntry(line, column);
    if (!entry || typeof entry !== "object" || !("originalSource" in entry)) {
      return filePath;
    }

    const originalSource = entry.originalSource;
    if (typeof originalSource !== "string" || !originalSource) return filePath;
    if (originalSource.startsWith("file://")) return fileURLToPath(originalSource);
    if (originalSource.startsWith("file:/")) return fileURLToPath(new URL(originalSource));
    return originalSource.replace(/^webpack:\/\/_N_E\/\.\//, "") || filePath;
  } catch {
    return filePath;
  }
}

export function toAbsoluteFileUri(filePath: string): string {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(process.cwd(), filePath);
  return pathToFileURL(absolutePath).toString();
}
