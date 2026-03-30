const mockRun = jest.fn();
const mockWaveSpeedConstructor = jest.fn(() => ({
  run: mockRun
}));
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

jest.mock("wavespeed", () => mockWaveSpeedConstructor);
jest.mock("@/config/logger", () => ({
  __esModule: true,
  default: mockLogger
}));

import { upscaleVideoTo4k } from "@/services/render/providers/wavespeed/upscaler";

describe("upscaleVideoTo4k", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WAVESPEED_API_KEY = "test-api-key";
  });

  it("uses the WaveSpeed SDK to run the video-upscaler model at 4k", async () => {
    mockRun.mockResolvedValueOnce({
      outputs: ["https://cdn.wavespeed.ai/outputs/upscaled.mp4"]
    });

    await expect(
      upscaleVideoTo4k({
        sourceUrl: "https://cdn.example.com/source.mp4"
      })
    ).resolves.toEqual({
      url: "https://cdn.wavespeed.ai/outputs/upscaled.mp4"
    });

    expect(mockWaveSpeedConstructor).toHaveBeenCalledWith("test-api-key");
    expect(mockRun).toHaveBeenCalledWith("wavespeed-ai/video-upscaler", {
      target_resolution: "4k",
      video: "https://cdn.example.com/source.mp4"
    });
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "wavespeed-ai/video-upscaler"
      }),
      "[WaveSpeedUpscaler] Submitting upscale request"
    );
    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "wavespeed-ai/video-upscaler"
      }),
      "[WaveSpeedUpscaler] Upscale completed"
    );
  });
});
