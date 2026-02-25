import { DomainDependencyError } from "@web/src/server/errors/domain";
import {
  encodeSseEvent
} from "@web/src/lib/sse/sseEncoder";
import {
  generateStructuredStreamForUseCase,
  getAiUseCaseConfig
} from "@web/src/server/services/ai";
import {
  RECENT_HOOKS_MAX,
  RECENT_HOOKS_TTL_SECONDS
} from "@web/src/server/services/contentRotation";
import { OUTPUT_FORMAT } from "./domain/outputFormat";
import {
  extractTextDelta,
  parseJsonArray,
  validateGeneratedItems
} from "./domain/parse";
import type { Redis } from "@web/src/server/cache/redis";

type Logger = {
  error: (payload: unknown, message: string) => void;
  info: (payload: unknown, message: string) => void;
};

async function initializeAiStream(
  systemPrompt: string,
  userPrompt: string,
  logger: Logger
): Promise<ReadableStream<Uint8Array>> {
  let response: Response;
  try {
    response = await generateStructuredStreamForUseCase({
      useCase: "content_generation_stream",
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      outputFormat: OUTPUT_FORMAT
    });
  } catch (error) {
    throw new DomainDependencyError(
      error instanceof Error ? error.message : "Failed to initialize AI stream"
    );
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    logger.error(
      { status: response.status, errorPayload },
      "AI provider error"
    );
    throw new DomainDependencyError("AI provider request failed", {
      upstreamStatus: response.status
    });
  }

  const upstream = response.body;
  if (!upstream) {
    throw new DomainDependencyError("AI provider response stream missing");
  }

  return upstream;
}

async function processStreamChunks(
  upstream: ReadableStream<Uint8Array>,
  controller: ReadableStreamDefaultController<Uint8Array>
): Promise<string> {
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  const reader = upstream.getReader();
  let stopReceived = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const line = part
          .split("\n")
          .find((entry) => entry.startsWith("data:"));
        if (!line) {
          continue;
        }

        const json = line.replace(/^data:\s*/, "");
        if (!json || json === "[DONE]") {
          continue;
        }

        let payload: {
          type?: string;
          delta?: { type?: string; text?: string };
        };
        try {
          payload = JSON.parse(json);
        } catch {
          continue;
        }

        if (payload.type === "message_stop") {
          stopReceived = true;
          break;
        }

        const deltaText = extractTextDelta(payload);
        if (deltaText) {
          fullText += deltaText;
          controller.enqueue(
            encodeSseEvent({ type: "delta", text: deltaText })
          );
        }
      }

      if (stopReceived) {
        await reader.cancel();
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  return fullText;
}

function parseAndValidateResponse(
  fullText: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
  logger: Logger
): unknown | null {
  let parsed: unknown;
  try {
    parsed = parseJsonArray(fullText);
  } catch (error) {
    logger.error({ error, text: fullText }, "Failed to parse AI response");
    controller.enqueue(
      encodeSseEvent({
        type: "error",
        message: "AI response could not be parsed as JSON"
      })
    );
    controller.close();
    return null;
  }

  validateGeneratedItems(parsed);
  return parsed;
}

async function updateRecentHooks(
  parsed: unknown,
  redis: Redis | null,
  recentHooksKey: string,
  logger: Logger
): Promise<void> {
  if (!redis) {
    return;
  }

  const hooks = (parsed as { hook?: string }[])
    .map((item) => item.hook)
    .filter((hook): hook is string => Boolean(hook));

  if (hooks.length > 0) {
    await redis.lpush(recentHooksKey, ...hooks);
    await redis.ltrim(recentHooksKey, 0, RECENT_HOOKS_MAX - 1);
    await redis.expire(recentHooksKey, RECENT_HOOKS_TTL_SECONDS);
    logger.info(
      { recentHooksKey, hookCount: hooks.length },
      "Updated recent hooks"
    );
  }
}

function sendDoneEvent(
  parsed: unknown,
  controller: ReadableStreamDefaultController<Uint8Array>,
  model: string | undefined
): void {
  controller.enqueue(
    encodeSseEvent({
      type: "done",
      items: parsed as unknown[],
      meta: {
        model: model ?? "configured-provider",
        batch_size: (parsed as unknown[]).length
      }
    })
  );
  controller.close();
}

export async function createSseResponse(args: {
  systemPrompt: string;
  userPrompt: string;
  redis: Redis | null;
  recentHooksKey: string;
  logger: Logger;
}): Promise<{
  stream: ReadableStream;
  status: number;
}> {
  const { systemPrompt, userPrompt, redis, recentHooksKey, logger } = args;
  const streamConfig = getAiUseCaseConfig("content_generation_stream");

  const upstream = await initializeAiStream(systemPrompt, userPrompt, logger);

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const fullText = await processStreamChunks(upstream, controller);
        const parsed = parseAndValidateResponse(fullText, controller, logger);
        if (parsed === null) {
          return;
        }
        await updateRecentHooks(parsed, redis, recentHooksKey, logger);
        sendDoneEvent(parsed, controller, streamConfig.model);
      } catch (error) {
        logger.error({ error }, "Streaming error");
        controller.enqueue(
          encodeSseEvent({
            type: "error",
            message: "Failed to stream response"
          })
        );
        controller.close();
      }
    }
  });

  return { stream, status: 200 };
}
