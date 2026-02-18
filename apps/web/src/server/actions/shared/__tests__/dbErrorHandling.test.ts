import { DrizzleError } from "drizzle-orm";

const mockDebug = jest.fn();
const mockInfo = jest.fn();
const mockError = jest.fn();

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    debug: (...args: unknown[]) => mockDebug(...args),
    info: (...args: unknown[]) => mockInfo(...args),
    error: (...args: unknown[]) => mockError(...args)
  })
}));

import { withDbErrorHandling } from "@web/src/server/actions/shared/dbErrorHandling";

describe("dbErrorHandling", () => {
  beforeEach(() => {
    mockDebug.mockReset();
    mockInfo.mockReset();
    mockError.mockReset();
  });

  it("returns successful result", async () => {
    const result = await withDbErrorHandling(async () => "ok", {
      actionName: "x"
    });

    expect(result).toBe("ok");
    expect(mockDebug).toHaveBeenCalled();
    expect(mockInfo).toHaveBeenCalled();
  });

  it("maps DrizzleError to custom message", async () => {
    await expect(
      withDbErrorHandling(
        async () => {
          throw new DrizzleError({ message: "db down" });
        },
        { actionName: "x", errorMessage: "friendly" }
      )
    ).rejects.toThrow("friendly");

    expect(mockError).toHaveBeenCalled();
  });

  it("rethrows normal errors", async () => {
    await expect(
      withDbErrorHandling(
        async () => {
          throw new Error("bad");
        },
        { actionName: "x" }
      )
    ).rejects.toThrow("bad");
  });

  it("throws generic for non-error throws", async () => {
    await expect(
      withDbErrorHandling(
        async () => {
          throw "boom";
        },
        { actionName: "x" }
      )
    ).rejects.toThrow("An unexpected error occurred");
  });
});
