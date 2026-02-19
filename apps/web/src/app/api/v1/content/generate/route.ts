/**
 * API Route: Generate social content via Claude Sonnet
 *
 * POST /api/v1/content/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { ApiError, requireAuthenticatedUser } from "../../_utils";
import {
  buildSystemPrompt,
  buildUserPrompt,
  type PromptAssemblyInput
} from "@web/src/lib/ai/prompts/engine/assemble";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { getSharedRedisClient } from "@web/src/lib/cache/redisClient";
import {
  RECENT_HOOKS_MAX,
  getRecentHooksKey,
  selectRotatedAudienceSegment
} from "@web/src/server/services/contentRotation";
import {
  buildPromptInput,
  parsePrimaryAudienceSegments
} from "./domain/promptInput";
import { resolveContentContext } from "./services/context";
import { writePromptLog } from "./services/promptLog";
import { createClaudeSseResponse } from "./services/anthropicStream";
import { getUserAdditionalSnapshot } from "./services/userAdditional";

const logger = createChildLogger(baseLogger, {
  module: "content-generate-route"
});

export async function POST(request: NextRequest) {
  try {
    logger.info("Received content generation request");
    const user = await requireAuthenticatedUser();

    const body = (await request.json()) as PromptAssemblyInput;
    if (!body?.category) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "category is required"
      });
    }

    if (!body.agent_profile) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "agent_profile is required"
      });
    }

    const redis = getSharedRedisClient();
    const userAdditionalSnapshot = await getUserAdditionalSnapshot(user.id);
    const allAudienceSegments = parsePrimaryAudienceSegments(
      userAdditionalSnapshot.targetAudiences
    );
    const audienceSegments = await selectRotatedAudienceSegment(
      redis,
      user.id,
      body.category,
      allAudienceSegments
    );
    const activeAudience = audienceSegments[0] ?? null;

    const recentHooksKey = getRecentHooksKey(user.id, body.category);
    const recentHooks = redis
      ? await redis.lrange<string>(recentHooksKey, 0, RECENT_HOOKS_MAX - 1)
      : [];

    const context = await resolveContentContext({
      body,
      snapshot: userAdditionalSnapshot,
      userId: user.id,
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
      userId: user.id,
      systemPrompt,
      userPrompt
    });

    return await createClaudeSseResponse({
      systemPrompt,
      userPrompt,
      redis,
      recentHooksKey,
      logger
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }

    const errorDetails =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error };

    logger.error(errorDetails, "Unhandled error generating content");
    return NextResponse.json(
      { error: "Server error", message: "Failed to generate content" },
      { status: 500 }
    );
  }
}
