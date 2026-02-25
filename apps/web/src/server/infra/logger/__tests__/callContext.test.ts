import {
  runWithCaller,
  getCallContext,
  withServerActionCaller
} from "@web/src/server/infra/logger/callContext";

describe("callContext", () => {
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
});
