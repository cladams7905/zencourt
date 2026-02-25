const mockGenerateStructuredStreamForUseCase = jest.fn();
const mockGetAiUseCaseConfig = jest.fn();

jest.mock("@web/src/server/services/ai", () => ({
  generateStructuredStreamForUseCase: (...args: unknown[]) =>
    (mockGenerateStructuredStreamForUseCase as (...a: unknown[]) => unknown)(
      ...args
    ),
  getAiUseCaseConfig: (useCase: string) => mockGetAiUseCaseConfig(useCase)
}));

import { ReadableStream } from "node:stream/web";
import { DomainDependencyError } from "@web/src/server/errors/domain";

// Polyfill so stream.ts can use new ReadableStream() in jsdom
(globalThis as unknown as { ReadableStream: typeof ReadableStream }).ReadableStream =
  ReadableStream;

import { createSseResponse } from "@web/src/server/actions/contentGeneration/stream";

function makeUpstreamStream(chunks: string[]): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    }
  });
}

async function readStreamToEvents(
  stream: ReadableStream<Uint8Array>
): Promise<string[]> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const events: string[] = [];
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const part of parts) {
        const match = part.match(/^data:\s*(.+)/m);
        if (match) events.push(match[1].trim());
      }
    }
    if (buffer) {
      const match = buffer.match(/^data:\s*(.+)/m);
      if (match) events.push(match[1].trim());
    }
  } finally {
    reader.releaseLock();
  }
  return events;
}

describe("contentGeneration stream", () => {
  const logger = {
    error: jest.fn(),
    info: jest.fn()
  };

  beforeEach(() => {
    mockGenerateStructuredStreamForUseCase.mockReset();
    mockGetAiUseCaseConfig.mockReturnValue({ model: "test-model" });
    logger.error.mockClear();
    logger.info.mockClear();
  });

  describe("createSseResponse", () => {
    it("returns stream and status 200 when upstream yields valid JSON array and message_stop", async () => {
      const jsonPayload = '[{"hook":"Hello","broll_query":"q","body":null,"cta":"Click","caption":"Cap"}]';
      const upstream = makeUpstreamStream([
        `data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"${jsonPayload}"}}\n\n`,
        `data: {"type":"message_stop"}\n\n`
      ]);
      mockGenerateStructuredStreamForUseCase.mockResolvedValue({
        ok: true,
        body: upstream
      });

      const result = await createSseResponse({
        systemPrompt: "system",
        userPrompt: "user",
        redis: null,
        recentHooksKey: "key",
        logger
      });

      expect(result.status).toBe(200);
      expect(result.stream).toBeDefined();
      // Consume stream to completion to ensure no unhandled errors
      const reader = (result.stream as ReadableStream<Uint8Array>).getReader();
      let chunkCount = 0;
      try {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
          chunkCount++;
        }
      } finally {
        reader.releaseLock();
      }
      expect(chunkCount).toBeGreaterThan(0);
    });

    it("throws DomainDependencyError when generateStructuredStreamForUseCase throws", async () => {
      mockGenerateStructuredStreamForUseCase.mockRejectedValue(
        new Error("Provider error")
      );

      await expect(
        createSseResponse({
          systemPrompt: "s",
          userPrompt: "u",
          redis: null,
          recentHooksKey: "k",
          logger
        })
      ).rejects.toThrow(DomainDependencyError);
      await expect(
        createSseResponse({
          systemPrompt: "s",
          userPrompt: "u",
          redis: null,
          recentHooksKey: "k",
          logger
        })
      ).rejects.toThrow("Provider error");
    });

    it("throws DomainDependencyError when response is not ok", async () => {
      mockGenerateStructuredStreamForUseCase.mockResolvedValue({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ error: "Internal" })
      });

      await expect(
        createSseResponse({
          systemPrompt: "s",
          userPrompt: "u",
          redis: null,
          recentHooksKey: "k",
          logger
        })
      ).rejects.toThrow(DomainDependencyError);
      await expect(
        createSseResponse({
          systemPrompt: "s",
          userPrompt: "u",
          redis: null,
          recentHooksKey: "k",
          logger
        })
      ).rejects.toThrow("AI provider request failed");
    });

    it("throws DomainDependencyError when response body is null", async () => {
      mockGenerateStructuredStreamForUseCase.mockResolvedValue({
        ok: true,
        body: null
      });

      await expect(
        createSseResponse({
          systemPrompt: "s",
          userPrompt: "u",
          redis: null,
          recentHooksKey: "k",
          logger
        })
      ).rejects.toThrow(DomainDependencyError);
      await expect(
        createSseResponse({
          systemPrompt: "s",
          userPrompt: "u",
          redis: null,
          recentHooksKey: "k",
          logger
        })
      ).rejects.toThrow("response stream missing");
    });

    it("sends error event when upstream text is not valid JSON array", async () => {
      const upstream = makeUpstreamStream([
        `data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"not json array"}}\n\n`,
        `data: {"type":"message_stop"}\n\n`
      ]);
      mockGenerateStructuredStreamForUseCase.mockResolvedValue({
        ok: true,
        body: upstream
      });

      const result = await createSseResponse({
        systemPrompt: "s",
        userPrompt: "u",
        redis: null,
        recentHooksKey: "k",
        logger
      });

      const events = await readStreamToEvents(
        result.stream as ReadableStream<Uint8Array>
      );
      const parsed = events.map((e) => {
        try {
          return JSON.parse(e);
        } catch {
          return null;
        }
      });
      const errorEvent = parsed.find((p) => p && p.type === "error");
      expect(errorEvent).toBeDefined();
      expect(errorEvent.message).toContain("could not be parsed");
    });
  });
});
