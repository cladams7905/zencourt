import { VisionService } from "../service";

function createLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  };
}

describe("vision/service", () => {
  it("classifies a room and reuses a cached OpenAI client", async () => {
    const createCompletion = jest
      .fn()
      .mockResolvedValue({
        choices: [{ message: { content: '{"category":"kitchen","confidence":0.9}' } }]
      });
    const clientFactory = jest.fn(() => ({
      chat: { completions: { create: createCompletion } }
    }));
    const service = new VisionService({
      clientFactory: clientFactory as never,
      logger: createLogger(),
      sleep: async () => undefined
    });

    await expect(service.classifyRoom("https://example.com/image-1.jpg")).resolves.toEqual({
      category: "kitchen",
      confidence: 0.9,
      primaryScore: undefined,
      perspective: undefined
    });

    await service.classifyRoom("https://example.com/image-2.jpg");

    expect(clientFactory).toHaveBeenCalledTimes(1);
    expect(createCompletion).toHaveBeenCalledTimes(2);
  });

  it("throws INVALID_RESPONSE when completion content is missing", async () => {
    const service = new VisionService({
      clientFactory: (() =>
        ({
          chat: {
            completions: {
              create: async () => ({ choices: [{ message: {} }] })
            }
          }
        }) as never),
      logger: createLogger(),
      sleep: async () => undefined
    });

    await expect(service.classifyRoom("https://example.com/image.jpg")).rejects.toMatchObject({
      code: "INVALID_RESPONSE"
    });
  });

  it("returns batch results and progress for mixed outcomes", async () => {
    const service = new VisionService({
      clientFactory: (() => ({}) as never),
      logger: createLogger()
    });
    const progress = jest.fn();

    jest
      .spyOn(service, "classifyRoom")
      .mockResolvedValueOnce({
        category: "kitchen",
        confidence: 0.8
      })
      .mockRejectedValueOnce(new Error("failed"));

    const results = await service.classifyRoomBatch(
      ["https://example.com/1.jpg", "https://example.com/2.jpg"],
      {
        concurrency: 1,
        onProgress: progress
      }
    );

    expect(results).toHaveLength(2);
    expect(results[0]?.success).toBe(true);
    expect(results[1]?.success).toBe(false);
    expect(progress).toHaveBeenCalledTimes(2);
  });

  it("rejects empty batch inputs", async () => {
    const service = new VisionService({
      clientFactory: (() => ({}) as never),
      logger: createLogger()
    });

    await expect(service.classifyRoomBatch([])).rejects.toMatchObject({
      code: "API_ERROR"
    });
  });
});
