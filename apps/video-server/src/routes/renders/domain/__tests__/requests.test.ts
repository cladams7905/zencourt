import { Request } from "express";
import {
  parseCreateRenderRequest,
  parseRenderJobIdParam
} from "@/routes/renders/domain/requests";

describe("renders request parsing", () => {
  it("parses create render request", () => {
    const parsed = parseCreateRenderRequest({ videoId: "video-1" });
    expect(parsed.videoId).toBe("video-1");
  });

  it("parses jobId param", () => {
    const req = { params: { jobId: "job-1" } } as unknown as Request<{
      jobId: string;
    }>;
    expect(parseRenderJobIdParam(req)).toBe("job-1");
  });

  it("throws when videoId is missing", () => {
    expect(() => parseCreateRenderRequest({})).toThrow("videoId required");
  });

  it("throws when videoId is whitespace", () => {
    expect(() => parseCreateRenderRequest({ videoId: "  " })).toThrow(
      "videoId required"
    );
  });

  it("throws when jobId param is missing", () => {
    const req = { params: {} } as unknown as Request<{ jobId: string }>;
    expect(() => parseRenderJobIdParam(req)).toThrow();
  });
});
