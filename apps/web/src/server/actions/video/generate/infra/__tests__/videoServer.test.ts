const mockGetVideoGenerationConfig = jest.fn();
const mockFetch = jest.fn();

jest.mock("@web/src/server/services/videoGeneration/config", () => ({
  getVideoGenerationConfig: (...args: unknown[]) =>
    mockGetVideoGenerationConfig(...args)
}));

import {
  enqueueVideoServerJobs,
  cancelVideoServerGeneration
} from "../videoServer";

describe("video server infra", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = mockFetch as unknown as typeof fetch;
    mockGetVideoGenerationConfig.mockReturnValue({
      appUrl: "https://app.example",
      videoServerBaseUrl: "http://video-server",
      videoServerApiKey: "secret"
    });
  });

  it("enqueues jobs successfully", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await enqueueVideoServerJobs({
      parentVideoId: "video-1",
      jobIds: ["j1", "j2"],
      listingId: "listing-1",
      userId: "user-1"
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "http://video-server/video/generate",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-API-Key": "secret" }),
        body: expect.stringContaining('"callbackUrl":"https://app.example/api/v1/webhooks/video"')
      })
    );
  });

  it("maps enqueue failures to ApiError", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ message: "upstream down" })
    });

    await expect(
      enqueueVideoServerJobs({
        parentVideoId: "video-1",
        jobIds: ["j1"],
        listingId: "listing-1",
        userId: "user-1"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 502,
        body: { error: "Video server error", message: "upstream down" }
      })
    );
  });

  it("cancels jobs and normalizes counts", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ canceledVideos: 2, canceledJobs: 4 })
    });

    const result = await cancelVideoServerGeneration({
      listingId: "listing-1"
    });

    expect(result).toEqual({
      success: true,
      listingId: "listing-1",
      canceledVideos: 2,
      canceledJobs: 4
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://video-server/video/cancel",
      expect.objectContaining({
        body: expect.stringContaining('"reason":"Canceled via workflow"')
      })
    );
  });

  it("maps cancel failures to ApiError", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "cancel failed" })
    });

    await expect(
      cancelVideoServerGeneration({ listingId: "listing-1", reason: "manual" })
    ).rejects.toEqual(
      expect.objectContaining({
        status: 500,
        body: { error: "Video server error", message: "cancel failed" }
      })
    );
  });
});
