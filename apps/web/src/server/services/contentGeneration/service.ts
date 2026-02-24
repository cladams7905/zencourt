import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";
import {
  buildSystemPrompt,
  buildUserPrompt
} from "@web/src/lib/ai/prompts/engine/assemble";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { getSharedRedisClient } from "@web/src/server/services/cache/redis";
import {
  RECENT_HOOKS_MAX,
  getRecentHooksKey,
  selectRotatedAudienceSegment
} from "@web/src/server/services/contentRotation";
import { getUserAdditionalSnapshot } from "@web/src/server/models/userAdditional";
import {
  buildPromptInput,
  parsePrimaryAudienceSegments,
  type ContentContext
} from "./domain/promptInput";
import { resolveContentContext } from "./context";
import { writePromptLog } from "./promptLog";
import { createSseResponse } from "./stream";

const logger = createChildLogger(baseLogger, {
  module: "content-generation-service"
});

/**
 * Run the full content generation flow: resolve context, build prompts,
 * log prompts (dev), stream AI response as SSE.
 */
export async function runContentGeneration(
  userId: string,
  body: PromptAssemblyInput
): Promise<{
  stream: ReadableStream;
  status: number;
}> {
  const redis = getSharedRedisClient();
  const userAdditionalSnapshot = await getUserAdditionalSnapshot(userId);
  const allAudienceSegments = parsePrimaryAudienceSegments(
    userAdditionalSnapshot.targetAudiences
  );
  const audienceSegments = await selectRotatedAudienceSegment(
    redis,
    userId,
    body.category,
    allAudienceSegments
  );
  const activeAudience = audienceSegments[0] ?? null;

  const recentHooksKey = getRecentHooksKey(userId, body.category);
  const recentHooks = redis
    ? await redis.lrange<string>(recentHooksKey, 0, RECENT_HOOKS_MAX - 1)
    : [];

  const context: ContentContext = await resolveContentContext({
    body,
    snapshot: userAdditionalSnapshot,
    userId,
    redis,
    activeAudience
  });

  const promptInput = buildPromptInput({
    body,
    snapshot: userAdditionalSnapshot,
    audienceSegments,
    recentHooks,
    context
  });

  const systemPrompt = await buildSystemPrompt(promptInput);
  const userPrompt = buildUserPrompt(promptInput);

  await writePromptLog({
    userId,
    systemPrompt,
    userPrompt
  });

  return createSseResponse({
    systemPrompt,
    userPrompt,
    redis,
    recentHooksKey,
    logger
  });
}
