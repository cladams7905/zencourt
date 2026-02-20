import express from "express";
import request from "supertest";
import renderRoutes from "@/routes/renders/route";
import { errorHandler } from "@/middleware/errorHandler";

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
});
