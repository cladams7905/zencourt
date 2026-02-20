import express from "express";
import request from "supertest";
import videoRoutes from "@/routes/video/route";
import { errorHandler } from "@/middleware/errorHandler";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/video", videoRoutes);
  app.use(errorHandler);
  return app;
}

describe("video route auth", () => {
  beforeEach(() => {
    process.env.VIDEO_SERVER_API_KEY = "test-api-key";
    delete process.env.VIDEO_SERVER_CLIENT_KEYS;
  });

  it("rejects requests without api key", async () => {
    const app = createApp();
    const response = await request(app).post("/video/generate").send({});

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: "Unauthorized",
      message: "Unauthorized"
    });
  });
});
