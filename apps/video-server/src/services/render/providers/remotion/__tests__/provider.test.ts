import { resolveEntryPoint } from "@/services/render/providers/remotion/provider";

describe("resolveEntryPoint", () => {
  it("prefers the Docker/runtime dist composition path when present", () => {
    const cwd = "/workspace";
    const existsSync = jest.fn((candidate: string) =>
      candidate ===
      "/workspace/apps/video-server/dist/apps/video-server/src/services/render/providers/remotion/composition/Root.js"
    );

    const entryPoint = resolveEntryPoint(cwd, existsSync);

    expect(entryPoint).toBe(
      "/workspace/apps/video-server/dist/apps/video-server/src/services/render/providers/remotion/composition/Root.js"
    );
  });

  it("prefers the built dist composition when both dist and src entrypoints exist", () => {
    const cwd = "/workspace";
    const existsSync = jest.fn((candidate: string) =>
      candidate ===
      "/workspace/apps/video-server/dist/apps/video-server/src/services/render/providers/remotion/composition/Root.js"
        ? true
        : candidate ===
            "/workspace/dist/apps/video-server/src/services/render/providers/remotion/composition/Root.js"
          ? true
          : candidate ===
            "/workspace/apps/video-server/src/services/render/providers/remotion/composition/Root.tsx"
          ? true
          : false
    );

    const entryPoint = resolveEntryPoint(cwd, existsSync);

    expect(entryPoint).toBe(
      "/workspace/apps/video-server/dist/apps/video-server/src/services/render/providers/remotion/composition/Root.js"
    );
  });
});
