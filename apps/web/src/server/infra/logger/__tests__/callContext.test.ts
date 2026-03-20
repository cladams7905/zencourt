/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  runWithCaller,
  getCallContext,
  withServerActionCaller
} from "@web/src/server/infra/logger/callContext";

describe("callContext", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterAll(() => {
    (process.env as any).NODE_ENV = originalNodeEnv;
  });

  describe("runWithCaller", () => {
    it("runs fn and returns result", async () => {
      const result = await runWithCaller("test-caller", async () => "ok");
      expect(result).toBe("ok");
    });

    it("stores caller in context during fn execution", async () => {
      await runWithCaller("my-caller", async () => {
        const ctx = getCallContext();
        expect(ctx?.caller).toBe("my-caller");
      });
    });

    it("stores requestId when provided", async () => {
      await runWithCaller("caller", "req-123", async () => {
        const ctx = getCallContext();
        expect(ctx?.caller).toBe("caller");
        expect(ctx?.requestId).toBe("req-123");
      });
    });

    it("returns undefined outside runWithCaller", () => {
      expect(getCallContext()).toBeUndefined();
    });

    it("context is isolated after fn completes", async () => {
      await runWithCaller("caller", () => Promise.resolve());
      expect(getCallContext()).toBeUndefined();
    });

    it("supports nested runWithCaller with inner overriding", async () => {
      await runWithCaller("outer", async () => {
        expect(getCallContext()?.caller).toBe("outer");
        await runWithCaller("inner", async () => {
          expect(getCallContext()?.caller).toBe("inner");
        });
        expect(getCallContext()?.caller).toBe("outer");
      });
    });

    it("works with sync fn", () => {
      const result = runWithCaller("sync", () => 42);
      expect(result).toBe(42);
    });
  });

  describe("withServerActionCaller", () => {
    it("wraps async fn and returns result", async () => {
      const action = withServerActionCaller("test", async (x: number) => x * 2);
      const result = await action(21);
      expect(result).toBe(42);
    });

    it("sets caller context during execution", async () => {
      const action = withServerActionCaller("myAction", async () => {
        const ctx = getCallContext();
        expect(ctx?.caller).toBe("myAction");
        return "ok";
      });
      await action();
    });

    it("passes args through", async () => {
      const action = withServerActionCaller(
        "add",
        async (a: number, b: number) => a + b
      );
      expect(await action(1, 2)).toBe(3);
    });
  });

  describe("development mode stack caller URI", () => {
    it("includes callerURI when NODE_ENV=development and stack mapping succeeds", async () => {
      jest.resetModules();
      (process.env as any).NODE_ENV = "development";

      jest.doMock("@web/src/server/infra/logger/stackSource", () => {
        return {
          getStructuredStackFrames: jest.fn(() => [
            {
              getFileName: (): string | undefined => undefined,
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: (): string => "node:internal/modules/x.js",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: () =>
                `${process.cwd()}/src/server/infra/logger/callContext.ts`,
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: () =>
                `${process.cwd()}/.next/server/app/(dashboard)/page.js`,
              getLineNumber: (): number => 123,
              getColumnNumber: (): number => 4
            }
          ]),
          normalizeStackFileName: jest.fn((x: string) => x),
          mapToOriginalSource: jest.fn((filePath: string) => filePath),
          toAbsoluteFileUri: jest.fn((filePath: string) => `uri:${filePath}`)
        };
      });

      const {
        runWithCaller: runWithCallerDev,
        getCallContext: getCallContextDev
      } = await import("@web/src/server/infra/logger/callContext");

      await runWithCallerDev("auth:test", "req-123", async () => {
        const ctx = getCallContextDev();
        expect(ctx?.caller).toBe("test"); // strips prefix after ":"
        expect(ctx?.requestId).toBe("req-123");
        expect(ctx?.callerURI).toBe("uri:src/app/(dashboard)/page.tsx");
      });
    });

    it("omits callerURI when stack inspection yields unknown", async () => {
      jest.resetModules();
      (process.env as any).NODE_ENV = "development";

      jest.doMock("@web/src/server/infra/logger/stackSource", () => {
        return {
          getStructuredStackFrames: jest.fn(() => [
            {
              getFileName: (): string => "node:internal/modules/x.js",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: (): string => "node:internal/modules/y.js",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: () =>
                `${process.cwd()}/src/server/infra/logger/callContext.ts`,
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: () => "node:internal/modules/z.js",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            }
          ]),
          normalizeStackFileName: jest.fn((x: string) => x),
          mapToOriginalSource: jest.fn((filePath: string) => filePath),
          toAbsoluteFileUri: jest.fn((filePath: string) => `uri:${filePath}`)
        };
      });

      const {
        runWithCaller: runWithCallerDev,
        getCallContext: getCallContextDev
      } = await import("@web/src/server/infra/logger/callContext");

      await runWithCallerDev("caller", async () => {
        const ctx = getCallContextDev();
        expect(ctx?.caller).toBe("caller");
        expect(ctx?.callerURI).toBeUndefined();
      });
    });

    it("omits callerURI when stackSource throws", async () => {
      jest.resetModules();
      (process.env as any).NODE_ENV = "development";

      jest.doMock("@web/src/server/infra/logger/stackSource", () => {
        return {
          getStructuredStackFrames: jest.fn(() => {
            throw new Error("stack failed");
          }),
          normalizeStackFileName: jest.fn((x: string) => x),
          mapToOriginalSource: jest.fn((filePath: string) => filePath),
          toAbsoluteFileUri: jest.fn((filePath: string) => `uri:${filePath}`)
        };
      });

      const {
        runWithCaller: runWithCallerDev,
        getCallContext: getCallContextDev
      } = await import("@web/src/server/infra/logger/callContext");

      await runWithCallerDev("caller", async () => {
        const ctx = getCallContextDev();
        expect(ctx?.callerURI).toBeUndefined();
      });
    });

    it("covers fallback branches for rawFile/line/column/relative", async () => {
      jest.resetModules();
      (process.env as any).NODE_ENV = "development";

      jest.doMock("@web/src/server/infra/logger/stackSource", () => {
        return {
          getStructuredStackFrames: jest.fn(() => [
            {
              getFileName: (): string => "unused-0",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: (): string => "unused-1",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: (): string => "unused-2",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            // i=3 due to skipFrames(2)
            {
              getFileName: (): string | undefined => undefined,
              getLineNumber: (): number | undefined => undefined,
              getColumnNumber: (): number | undefined => undefined
            },
            // node:internal => continue
            {
              getFileName: (): string => "node:internal/modules/x.js",
              getLineNumber: (): number | undefined => undefined,
              getColumnNumber: (): number | undefined => undefined
            },
            // final frame: make path.relative return "" so it falls back to filePath
            {
              getFileName: () => process.cwd(),
              getLineNumber: (): number | undefined => undefined,
              getColumnNumber: (): number | undefined => undefined
            }
          ]),
          normalizeStackFileName: jest.fn((x: string) => x),
          mapToOriginalSource: jest.fn((filePath: string) => filePath),
          toAbsoluteFileUri: jest.fn((filePath: string) => `uri:${filePath}`)
        };
      });

      const {
        runWithCaller: runWithCallerDev,
        getCallContext: getCallContextDev
      } = await import("@web/src/server/infra/logger/callContext");

      await runWithCallerDev("caller", async () => {
        const ctx = getCallContextDev();
        expect(ctx?.caller).toBe("caller");
        expect(ctx?.callerURI).toContain("uri:");
      });
    });

    it("covers normalizeToSourcePath for .next/server/* (non-app) paths", async () => {
      jest.resetModules();
      (process.env as any).NODE_ENV = "development";

      jest.doMock("@web/src/server/infra/logger/stackSource", () => {
        return {
          getStructuredStackFrames: jest.fn(() => [
            {
              getFileName: (): string => "unused-0",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: (): string => "unused-1",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: (): string => "unused-2",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: () =>
                `${process.cwd()}/.next/server/app-pages/test.js`,
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            }
          ]),
          normalizeStackFileName: jest.fn((x: string) => x),
          mapToOriginalSource: jest.fn((filePath: string) => filePath),
          toAbsoluteFileUri: jest.fn((filePath: string) => `uri:${filePath}`)
        };
      });

      const {
        runWithCaller: runWithCallerDev,
        getCallContext: getCallContextDev
      } = await import("@web/src/server/infra/logger/callContext");

      await runWithCallerDev("caller", async () => {
        const ctx = getCallContextDev();
        expect(ctx?.callerURI).toBe("uri:app-pages/test.tsx");
      });
    });

    it("covers normalizeToSourcePath for webpack:// and returns extracted src path", async () => {
      jest.resetModules();
      (process.env as any).NODE_ENV = "development";

      jest.doMock("@web/src/server/infra/logger/stackSource", () => {
        return {
          getStructuredStackFrames: jest.fn(() => [
            {
              getFileName: (): string => "unused-0",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: (): string => "unused-1",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: (): string => "unused-2",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              // keep webpack:// substring in relative path
              getFileName: () =>
                `${process.cwd()}/webpack://_N_E/./src/server/infra/logger/other.ts`,
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            }
          ]),
          normalizeStackFileName: jest.fn((x: string) => x),
          mapToOriginalSource: jest.fn((filePath: string) => filePath),
          toAbsoluteFileUri: jest.fn((filePath: string) => `uri:${filePath}`)
        };
      });

      const {
        runWithCaller: runWithCallerDev,
        getCallContext: getCallContextDev
      } = await import("@web/src/server/infra/logger/callContext");

      await runWithCallerDev("caller", async () => {
        const ctx = getCallContextDev();
        expect(ctx?.callerURI).toBe(
          "uri:webpack:/_N_E/src/server/infra/logger/other.ts"
        );
      });
    });

    it("covers normalizeToSourcePath for webpack-internal: and returns extracted src path", async () => {
      jest.resetModules();
      (process.env as any).NODE_ENV = "development";

      jest.doMock("@web/src/server/infra/logger/stackSource", () => {
        return {
          getStructuredStackFrames: jest.fn(() => [
            {
              getFileName: (): string => "unused-0",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: (): string => "unused-1",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: (): string => "unused-2",
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            },
            {
              getFileName: () =>
                `${process.cwd()}/webpack-internal:///./src/server/infra/logger/other.ts`,
              getLineNumber: (): number => 1,
              getColumnNumber: (): number => 1
            }
          ]),
          normalizeStackFileName: jest.fn((x: string) => x),
          mapToOriginalSource: jest.fn((filePath: string) => filePath),
          toAbsoluteFileUri: jest.fn((filePath: string) => `uri:${filePath}`)
        };
      });

      const {
        runWithCaller: runWithCallerDev,
        getCallContext: getCallContextDev
      } = await import("@web/src/server/infra/logger/callContext");

      await runWithCallerDev("caller", async () => {
        const ctx = getCallContextDev();
        expect(ctx?.callerURI).toBe("uri:src/server/infra/logger/other.ts");
      });
    });
  });
});
