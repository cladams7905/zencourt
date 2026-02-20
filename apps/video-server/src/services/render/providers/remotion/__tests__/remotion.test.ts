const mockExistsSync = jest.fn();
const mockMkdir = jest.fn();
const mockReadFile = jest.fn();
const mockRm = jest.fn();
const mockTmpdir = jest.fn();
const mockBundle = jest.fn();
const mockEnsureBrowser = jest.fn();
const mockSelectComposition = jest.fn();
const mockRenderMedia = jest.fn();
const mockRenderStill = jest.fn();

jest.mock("fs", () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args)
}));

jest.mock("fs/promises", () => ({
  mkdir: (...args: unknown[]) => mockMkdir(...args),
  readFile: (...args: unknown[]) => mockReadFile(...args),
  rm: (...args: unknown[]) => mockRm(...args)
}));

jest.mock("os", () => ({
  tmpdir: (...args: unknown[]) => mockTmpdir(...args)
}));

jest.mock("@remotion/bundler", () => ({
  bundle: (...args: unknown[]) => mockBundle(...args)
}));

jest.mock("@remotion/renderer", () => ({
  ensureBrowser: (...args: unknown[]) => mockEnsureBrowser(...args),
  selectComposition: (...args: unknown[]) => mockSelectComposition(...args),
  renderMedia: (...args: unknown[]) => mockRenderMedia(...args),
  renderStill: (...args: unknown[]) => mockRenderStill(...args)
}));

describe("remotion provider", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    mockExistsSync.mockReturnValue(true);
    mockMkdir.mockResolvedValue(undefined);
    mockTmpdir.mockReturnValue("/tmp");
    mockBundle.mockResolvedValue("http://bundle-url");
    mockEnsureBrowser.mockResolvedValue(undefined);
    mockSelectComposition.mockResolvedValue({
      durationInFrames: 120,
      fps: 30
    });
    mockRenderMedia.mockResolvedValue(undefined);
    mockRenderStill.mockResolvedValue(undefined);
    mockReadFile
      .mockResolvedValueOnce(Buffer.from("video-buffer"))
      .mockResolvedValueOnce(Buffer.from("thumb-buffer"));
    mockRm.mockResolvedValue(undefined);
  });

  it("renders video and thumbnail and returns expected result", async () => {
    const { remotionProvider } = await import("@/services/render/providers/remotion");

    const onProgress = jest.fn();
    await remotionProvider.renderListingVideo({
      clips: [{ src: "https://cdn/clip.mp4", durationSeconds: 2 }],
      orientation: "vertical",
      videoId: "video-1",
      onProgress
    });

    expect(mockEnsureBrowser).toHaveBeenCalledTimes(1);
    expect(mockBundle).toHaveBeenCalledTimes(1);
    expect(mockSelectComposition).toHaveBeenCalledTimes(1);
    expect(mockRenderMedia).toHaveBeenCalledTimes(1);
    expect(mockRenderStill).toHaveBeenCalledTimes(1);
    expect(mockReadFile).toHaveBeenCalledTimes(2);
    expect(mockRm).toHaveBeenCalledTimes(2);
  });

  it("reuses bundled project across renders", async () => {
    const { remotionProvider } = await import("@/services/render/providers/remotion");

    await remotionProvider.renderListingVideo({
      clips: [{ src: "https://cdn/clip-a.mp4", durationSeconds: 2 }],
      orientation: "vertical",
      videoId: "video-a"
    });

    mockReadFile
      .mockResolvedValueOnce(Buffer.from("video-buffer-2"))
      .mockResolvedValueOnce(Buffer.from("thumb-buffer-2"));

    await remotionProvider.renderListingVideo({
      clips: [{ src: "https://cdn/clip-b.mp4", durationSeconds: 2 }],
      orientation: "landscape",
      videoId: "video-b"
    });

    expect(mockEnsureBrowser).toHaveBeenCalledTimes(1);
    expect(mockBundle).toHaveBeenCalledTimes(1);
  });

  it("throws when no remotion entrypoint exists", async () => {
    mockExistsSync.mockReturnValue(false);
    const { remotionProvider } = await import("@/services/render/providers/remotion");

    await expect(
      remotionProvider.renderListingVideo({
        clips: [{ src: "https://cdn/clip.mp4", durationSeconds: 2 }],
        orientation: "vertical",
        videoId: "video-1"
      })
    ).rejects.toThrow("Remotion entry point not found");
  });
});
