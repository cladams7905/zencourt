/* eslint-disable @typescript-eslint/no-explicit-any */
let lastContext: Record<string, unknown> | undefined;

const createLoggerMock = jest.fn(
  (opts: { contextMixin?: () => Record<string, unknown> }) => {
    return {
      debug: () => {
        lastContext = opts.contextMixin?.();
      },
      info: () => {
        lastContext = opts.contextMixin?.();
      },
      warn: () => {
        lastContext = opts.contextMixin?.();
      },
      error: () => {
        lastContext = opts.contextMixin?.();
      }
    };
  }
);

describe("core/logging logger", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    lastContext = undefined;
    process.env = { ...originalEnv };

    jest.doMock("@shared/utils/logger", () => ({
      createLogger: createLoggerMock,
      createChildLogger: jest.fn()
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  async function importTestLogger() {
    const mod = await import("@web/src/lib/core/logging/logger");
    return mod.logger ?? mod.default;
  }

  it("includes invokedBy, invokedByURI, and actionURI when enabled", async () => {
    (process.env as any).NODE_ENV = "development";
    (process.env as any).LOG_INCLUDE_ACTION_URI = "true";
    (process.env as any).LOG_INCLUDE_INVOKEDBY_URI = "true";

    jest.doMock("@web/src/server/infra/logger/callContext", () => ({
      getCallContext: jest.fn(() => ({
        caller: "myCaller",
        callerURI: "invokedBy-uri",
        requestId: "req-1"
      }))
    }));

    const getStructuredStackFramesMock = jest.fn(() => [
      {
        getFileName: () => "unused-0",
        getLineNumber: (): number => 1,
        getColumnNumber: (): number => 1
      } as any,
      // rawFile missing => continue
      {
        getFileName: (): string | undefined => undefined,
        getLineNumber: (): number => 1,
        getColumnNumber: (): number => 1
      } as any,
      // node:internal => skip
      {
        getFileName: (): string => "node:internal/modules/x.js",
        getLineNumber: (): number => 1,
        getColumnNumber: (): number => 1
      } as any,
      // /node_modules/pino/ => skip
      {
        getFileName: (): string => "/node_modules/pino/pretty.js",
        getLineNumber: (): number => 1,
        getColumnNumber: (): number => 1
      } as any,
      // skip path in actionUriFrameSkipPaths => skip
      {
        getFileName: (): string => "/apps/web/src/lib/core/logging/logger.ts",
        getLineNumber: (): number => 1,
        getColumnNumber: (): number => 1
      } as any,
      // rawFile not skipped, but mapped file is skipped => continue
      {
        getFileName: (): string => "/tmp/action-that-maps-to-skip.js",
        getLineNumber: (): number => 10,
        getColumnNumber: (): number => 5
      },
      // final return
      {
        getFileName: (): string => "/tmp/real-action.js",
        getLineNumber: (): number => 11,
        getColumnNumber: (): number => 6
      }
    ]);

    jest.doMock("@web/src/server/infra/logger/stackSource", () => ({
      getStructuredStackFrames: getStructuredStackFramesMock,
      normalizeStackFileName: jest.fn((x: string) => x),
      mapToOriginalSource: jest.fn((filePath: string) => {
        if (filePath.includes("maps-to-skip")) {
          return "/apps/web/src/server/models/shared/dbErrorHandling.ts";
        }
        return filePath.replace(/\.js$/, ".tsx");
      }),
      toAbsoluteFileUri: jest.fn((filePath: string) => `uri:${filePath}`)
    }));

    const logger = await importTestLogger();
    logger.info("hello");

    expect(lastContext).toEqual(
      expect.objectContaining({
        invokedBy: "myCaller",
        invokedByURI: "invokedBy-uri",
        requestId: "req-1",
        actionURI: "uri:/tmp/real-action.tsx"
      })
    );
  });

  it("omits actionURI when stack inspection returns no usable frame", async () => {
    (process.env as any).NODE_ENV = "development";
    (process.env as any).LOG_INCLUDE_ACTION_URI = "true";
    (process.env as any).LOG_INCLUDE_INVOKEDBY_URI = "true";

    jest.doMock("@web/src/server/infra/logger/callContext", () => ({
      getCallContext: jest.fn(() => ({
        caller: "myCaller",
        requestId: "req-2"
      }))
    }));

    jest.doMock("@web/src/server/infra/logger/stackSource", () => ({
      getStructuredStackFrames: jest.fn(() => [
        {
          getFileName: (): string | undefined => undefined,
          getLineNumber: (): number => 1,
          getColumnNumber: (): number => 1
        } as any,
        {
          getFileName: (): string => "node:internal/modules/x.js",
          getLineNumber: (): number => 1,
          getColumnNumber: (): number => 1
        } as any,
        {
          getFileName: (): string => "/node_modules/pino/pretty.js",
          getLineNumber: (): number => 1,
          getColumnNumber: (): number => 1
        } as any
      ]),
      normalizeStackFileName: jest.fn((x: string) => x),
      mapToOriginalSource: jest.fn((filePath: string) => filePath),
      toAbsoluteFileUri: jest.fn((filePath: string) => `uri:${filePath}`)
    }));

    const logger = await importTestLogger();
    logger.info("hello");

    expect(lastContext).toEqual(
      expect.objectContaining({
        invokedBy: "myCaller",
        requestId: "req-2"
      })
    );
    expect(lastContext?.actionURI).toBeUndefined();
    expect(lastContext?.invokedByURI).toBeUndefined();
  });

  it("omits actionURI when stackSource throws", async () => {
    (process.env as any).NODE_ENV = "development";
    (process.env as any).LOG_INCLUDE_ACTION_URI = "true";
    (process.env as any).LOG_INCLUDE_INVOKEDBY_URI = "false";

    jest.doMock("@web/src/server/infra/logger/callContext", () => ({
      getCallContext: jest.fn(() => ({
        caller: "myCaller",
        callerURI: "invokedBy-uri",
        requestId: undefined
      }))
    }));

    jest.doMock("@web/src/server/infra/logger/stackSource", () => ({
      getStructuredStackFrames: jest.fn(() => {
        throw new Error("boom");
      }),
      normalizeStackFileName: jest.fn((x: string) => x),
      mapToOriginalSource: jest.fn((x: string) => x),
      toAbsoluteFileUri: jest.fn((x: string) => `uri:${x}`)
    }));

    const logger = await importTestLogger();
    logger.info("hello");

    expect(lastContext).toEqual(
      expect.objectContaining({
        invokedBy: "myCaller"
      })
    );
    expect(lastContext?.actionURI).toBeUndefined();
    expect(lastContext?.invokedByURI).toBeUndefined();
    expect(lastContext?.requestId).toBeUndefined();
  });

  it("does not call stack inspection when includeActionURI is disabled", async () => {
    (process.env as any).NODE_ENV = "test";
    (process.env as any).LOG_INCLUDE_ACTION_URI = "true";
    (process.env as any).LOG_INCLUDE_INVOKEDBY_URI = "true";

    jest.doMock("@web/src/server/infra/logger/callContext", () => ({
      getCallContext: jest.fn(() => ({
        caller: "myCaller",
        callerURI: "invokedBy-uri",
        requestId: "req-3"
      }))
    }));

    const getStructuredStackFramesMock = jest.fn(() => [
      {
        getFileName: (): string => "/tmp/should-not-be-called.js",
        getLineNumber: (): number => 1,
        getColumnNumber: (): number => 1
      } as any
    ]);

    jest.doMock("@web/src/server/infra/logger/stackSource", () => ({
      getStructuredStackFrames: getStructuredStackFramesMock,
      normalizeStackFileName: jest.fn((x: string) => x),
      mapToOriginalSource: jest.fn((x: string) => x),
      toAbsoluteFileUri: jest.fn((x: string) => `uri:${x}`)
    }));

    const logger = await importTestLogger();
    logger.info("hello");

    expect(getStructuredStackFramesMock).not.toHaveBeenCalled();
    expect(lastContext).toEqual(
      expect.objectContaining({
        invokedBy: "myCaller",
        requestId: "req-3"
      })
    );
    expect(lastContext?.actionURI).toBeUndefined();
    expect(lastContext?.invokedByURI).toBeUndefined();
  });
});
