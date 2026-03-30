import express from "express";
import request from "supertest";
import { renderQueue } from "@/services/render";
import renderRoutes from "@/routes/renders/route";
import { errorHandler } from "@/middleware/errorHandler";

jest.mock("@/services/render/providers/remotion", () => ({
  remotionProvider: {
    renderListingVideo: jest.fn()
  }
}));

jest.mock("@/services/render", () => ({
  renderQueue: {
    createJob: jest.fn(),
    getJob: jest.fn(),
    cancelJob: jest.fn(),
    clearArtifact: jest.fn(),
    updateJobPhase: jest.fn()
  }
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/renders", renderRoutes);
  app.use(errorHandler);
  return app;
}

describe("renders route auth", () => {
  beforeEach(() => {
    process.env.VIDEO_SERVER_API_KEY = "test-api-key";
    delete process.env.VIDEO_SERVER_CLIENT_KEYS;
  });

  it("rejects requests without api key", async () => {
    const app = createApp();
    const response = await request(app).post("/renders").send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: "Unauthorized",
      message: "Unauthorized"
    });
  });

  it("streams a reel export when api key is valid", async () => {
    const app = createApp();
    (renderQueue.createJob as jest.Mock).mockReturnValue("export-job-1");
    (renderQueue.updateJobPhase as jest.Mock | undefined)?.mockReturnValue(
      undefined
    );

    const response = await request(app)
      .post("/renders/reel-export")
      .set("X-API-Key", "test-api-key")
      .send({
        exportId: "export-1",
        orientation: "vertical",
        quality: "premium",
        clips: [
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-1",
            originalVideoUrl: "https://cdn.example.com/video.mp4",
            upscaleUrl: null,
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      jobId: "export-job-1"
    });
    expect(renderQueue.createJob).toHaveBeenCalledWith(
      expect.objectContaining({
        clips: [
          expect.objectContaining({
            src: "https://cdn.example.com/video.mp4",
            durationSeconds: 2.5
          })
        ],
        orientation: "vertical",
        videoId: "export-1"
      }),
      expect.objectContaining({
        timeoutMs: 10 * 60 * 1000,
        onComplete: expect.any(Function)
      }),
      "export-1"
    );
  });

  it("uses a five-minute timeout for standard reel exports", async () => {
    const app = createApp();
    (renderQueue.createJob as jest.Mock).mockReturnValue("export-standard-1");

    const response = await request(app)
      .post("/renders/reel-export")
      .set("X-API-Key", "test-api-key")
      .send({
        exportId: "export-standard-1",
        orientation: "vertical",
        quality: "standard",
        clips: [
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-1",
            originalVideoUrl: "https://cdn.example.com/video.mp4",
            upscaleUrl: null,
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      });

    expect(response.status).toBe(200);
    expect(renderQueue.createJob).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        timeoutMs: 5 * 60 * 1000
      }),
      "export-standard-1"
    );
  });

  it("does not reference jobId before initialization when createJob invokes callbacks synchronously", async () => {
    const app = createApp();
    (renderQueue.createJob as jest.Mock).mockImplementation(
      (
        _data: unknown,
        callbacks?: { onError?: (error: Error) => Promise<void> },
        jobIdOverride?: string
      ) => {
        void callbacks?.onError?.(new Error("sync failure"));
        return jobIdOverride ?? "export-job-sync";
      }
    );

    const response = await request(app)
      .post("/renders/reel-export")
      .set("X-API-Key", "test-api-key")
      .send({
        exportId: "export-sync",
        orientation: "vertical",
        quality: "premium",
        clips: [
          {
            sourceType: "listing_clip",
            clipVersionId: "clip-version-1",
            originalVideoUrl: "https://cdn.example.com/video.mp4",
            upscaleUrl: null,
            durationSeconds: 2.5,
            textOverlay: null,
            supplementalAddressOverlay: null
          }
        ]
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      jobId: "export-sync"
    });
  });

  it("returns reel export status including progress and artifact readiness", async () => {
    const app = createApp();
    (renderQueue.getJob as jest.Mock).mockReturnValue({
      status: "in-progress",
      phase: "upscaling",
      progress: 0.42,
      data: {
        videoId: "export-job-1",
        listingId: "reel-export",
        userId: "reel-export",
        clips: [],
        orientation: "vertical"
      },
      cancel: jest.fn()
    });

    const response = await request(app)
      .get("/renders/export-job-1")
      .set("X-API-Key", "test-api-key");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      job: {
        status: "upscaling",
        progress: 0.42
      }
    });
  });
});
