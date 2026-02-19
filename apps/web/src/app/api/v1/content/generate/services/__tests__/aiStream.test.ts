/** @jest-environment node */

const mockGenerateStructuredStreamForUseCase = jest.fn();
jest.mock("../../../../_utils", () => ({
  ApiError: class extends Error {
    status: number;
    body: { error: string; message: string };
    constructor(status: number, body: { error: string; message: string }) {
      super(body.message);
      this.status = status;
      this.body = body;
    }
  }
}));

jest.mock("@web/src/server/services/ai", () => ({
  generateStructuredStreamForUseCase: (...args: unknown[]) =>
    mockGenerateStructuredStreamForUseCase(...args),
  getAiUseCaseConfig: () => ({ model: "test-model" })
}));

import { createSseResponse } from "../aiStream";

function makeUpstreamSseResponse(events: unknown[], status = 200): Response {
  const encoder = new TextEncoder();
  const payload = events.map((event) => `data: ${JSON.stringify(event)}\n\n`).join("");
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(payload));
      controller.close();
    }
  });

  return new Response(stream, { status });
}

function parseSse(raw: string): Array<Record<string, unknown>> {
  return raw
    .split("\n\n")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => part.replace(/^data:\s*/, ""))
    .map((json) => JSON.parse(json) as Record<string, unknown>);
}

describe("content/generate services/aiStream", () => {
  const logger = {
    error: jest.fn(),
    info: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("throws ApiError when provider request returns non-ok", async () => {
    mockGenerateStructuredStreamForUseCase.mockResolvedValue(
      new Response(JSON.stringify({ error: "bad" }), { status: 502 })
    );

    await expect(
      createSseResponse({
        systemPrompt: "sys",
        userPrompt: "user",
        redis: null,
        recentHooksKey: "recent:key",
        logger
      })
    ).rejects.toMatchObject({ status: 502 });
  });

  it("streams delta and done events when upstream response is valid", async () => {
    mockGenerateStructuredStreamForUseCase.mockResolvedValue(
      makeUpstreamSseResponse([
        { type: "content_block_delta", delta: { type: "text_delta", text: "[" } },
        { type: "content_block_delta", delta: { type: "text_delta", text: '{"hook":"A"}' } },
        { type: "content_block_delta", delta: { type: "text_delta", text: "]" } },
        { type: "message_stop" }
      ])
    );

    const response = await createSseResponse({
      systemPrompt: "sys",
      userPrompt: "user",
      redis: null,
      recentHooksKey: "recent:key",
      logger
    });

    const events = parseSse(await response.text());
    expect(events.map((event) => event.type)).toEqual([
      "delta",
      "delta",
      "delta",
      "done"
    ]);
    expect(events[3]?.meta).toEqual(
      expect.objectContaining({ batch_size: 1 })
    );
  });

  it("writes hooks to redis for parsed items", async () => {
    const redis = {
      lpush: jest.fn().mockResolvedValue(undefined),
      ltrim: jest.fn().mockResolvedValue(undefined),
      expire: jest.fn().mockResolvedValue(undefined)
    };

    mockGenerateStructuredStreamForUseCase.mockResolvedValue(
      makeUpstreamSseResponse([
        { type: "content_block_delta", delta: { type: "text_delta", text: '[{"hook":"A"}]' } },
        { type: "message_stop" }
      ])
    );

    const response = await createSseResponse({
      systemPrompt: "sys",
      userPrompt: "user",
      redis: redis as never,
      recentHooksKey: "recent:key",
      logger
    });

    await response.text();

    expect(redis.lpush).toHaveBeenCalledWith("recent:key", "A");
    expect(redis.ltrim).toHaveBeenCalled();
    expect(redis.expire).toHaveBeenCalled();
  });

  it("emits error event when parsed response is invalid JSON", async () => {
    mockGenerateStructuredStreamForUseCase.mockResolvedValue(
      makeUpstreamSseResponse([
        { type: "content_block_delta", delta: { type: "text_delta", text: "not-json" } },
        { type: "message_stop" }
      ])
    );

    const response = await createSseResponse({
      systemPrompt: "sys",
      userPrompt: "user",
      redis: null,
      recentHooksKey: "recent:key",
      logger
    });

    const events = parseSse(await response.text());
    expect(events[0]).toEqual({
      type: "delta",
      text: "not-json"
    });
    expect(events[1]).toEqual({
      type: "error",
      message: "AI response could not be parsed as JSON"
    });
  });
});
