import { NextResponse } from "next/server";
import { ApiError } from "../../../_utils";
import {
  encodeSseEvent,
  makeSseStreamHeaders
} from "@web/src/lib/sse/sseEncoder";
import { generateStructuredStream } from "@web/src/server/services/ai";
import {
  RECENT_HOOKS_MAX,
  RECENT_HOOKS_TTL_SECONDS
} from "@web/src/server/services/contentRotation";
import { OUTPUT_FORMAT } from "../domain/outputFormat";
import {
  extractTextDelta,
  parseJsonArray,
  validateGeneratedItems
} from "../domain/parse";

const DEFAULT_AI_MODEL = "claude-haiku-4-5-20251001";

export async function createSseResponse(args: {
  systemPrompt: string;
  userPrompt: string;
  redis: ReturnType<
    typeof import("@web/src/lib/cache/redisClient").getSharedRedisClient
  >;
  recentHooksKey: string;
  logger: {
    error: (payload: unknown, message: string) => void;
    info: (payload: unknown, message: string) => void;
  };
}): Promise<NextResponse> {
  const { systemPrompt, userPrompt, redis, recentHooksKey, logger } = args;

  let response: Response;
  try {
    response = await generateStructuredStream({
      provider: "anthropic",
      model: process.env.CONTENT_GENERATION_MODEL || DEFAULT_AI_MODEL,
      maxTokens: 2800,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      outputFormat: OUTPUT_FORMAT,
      betaHeader: "structured-outputs-2025-11-13"
    });
  } catch (error) {
    throw new ApiError(500, {
      error: "Missing configuration",
      message:
        error instanceof Error
          ? error.message
          : "Failed to initialize AI stream"
    });
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    logger.error(
      { status: response.status, errorPayload },
      "AI provider error"
    );
    throw new ApiError(response.status, {
      error: "Upstream error",
      message: "AI provider request failed"
    });
  }

  const upstream = response.body;
  if (!upstream) {
    throw new ApiError(502, {
      error: "Invalid response",
      message: "AI provider response stream missing"
    });
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const reader = upstream.getReader();
        let stopReceived = false;
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

        let parsed: unknown;
        try {
          parsed = parseJsonArray(fullText);
        } catch (error) {
          logger.error(
            { error, text: fullText },
            "Failed to parse AI response"
          );
          controller.enqueue(
            encodeSseEvent({
              type: "error",
              message: "AI response could not be parsed as JSON"
            })
          );
          controller.close();
          return;
        }

        validateGeneratedItems(parsed);

        if (redis) {
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

        controller.enqueue(
          encodeSseEvent({
            type: "done",
            items: parsed as unknown[],
            meta: {
              model: process.env.CONTENT_GENERATION_MODEL || DEFAULT_AI_MODEL,
              batch_size: (parsed as unknown[]).length
            }
          })
        );
        controller.close();
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

  return new NextResponse(stream, { headers: makeSseStreamHeaders() });
}
