import express from "express";
import request from "supertest";
import storageRoutes from "@/routes/storage/route";
import { errorHandler } from "@/middleware/errorHandler";
import { storageService } from "@/services/storageService";
import { VideoProcessingErrorType } from "@shared/types/api";

jest.mock("@/services/storageService", () => ({
  storageService: {
    uploadFile: jest.fn().mockResolvedValue("https://cdn.local/file.jpg"),
    getSignedDownloadUrl: jest
      .fn()
      .mockResolvedValue("https://cdn.local/file.jpg?sig=1"),
    extractKeyFromUrl: jest.fn(),
    deleteFile: jest.fn()
  }
}));

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/storage", storageRoutes);
  app.use(errorHandler);
  return app;
}

describe("storage route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VIDEO_SERVER_API_KEY = "test-api-key";
    delete process.env.VIDEO_SERVER_CLIENT_KEYS;
  });

  it("rejects unauthenticated requests", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/storage/signed-url")
      .send({ key: "uploads/test.jpg" });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: "Unauthorized",
      message: "Unauthorized"
    });
  });

  it("rejects unsupported file types", async () => {
    const app = createApp();
    const response = await request(app)
      .post("/storage/upload")
      .set("x-api-key", "test-api-key")
      .attach("file", Buffer.from("plain text"), {
        filename: "notes.txt",
        contentType: "text/plain"
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(VideoProcessingErrorType.INVALID_INPUT);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });

  it("rejects files that exceed the upload size limit", async () => {
    const app = createApp();
    const largeBuffer = Buffer.alloc(50 * 1024 * 1024 + 1, 1);

    const response = await request(app)
      .post("/storage/upload")
      .set("x-api-key", "test-api-key")
      .attach("file", largeBuffer, {
        filename: "large.mp4",
        contentType: "video/mp4"
      });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe(VideoProcessingErrorType.INVALID_INPUT);
    expect(storageService.uploadFile).not.toHaveBeenCalled();
  });
});
