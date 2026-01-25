/**
 * API Route: Generate social content via Claude Sonnet
 *
 * POST /api/v1/content/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { ApiError, requireAuthenticatedUser } from "../../_utils";
import {
  buildSystemPrompt,
  buildUserPrompt,
  type PromptAssemblyInput
} from "@web/src/lib/prompts/assemble";
import { createChildLogger, logger as baseLogger } from "@web/src/lib/logger";
import { db, eq, userAdditional } from "@db/client";
import { Redis } from "@upstash/redis";
import {
  getRentCastMarketData,
  parseMarketLocation
} from "@web/src/server/services/marketDataService";
import {
  getCityDescription,
  getCommunityDataByZipAndAudience
} from "@web/src/server/services/communityDataService";

const logger = createChildLogger(baseLogger, {
  module: "content-generate-route"
});

const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const RECENT_HOOKS_TTL_SECONDS = 60 * 60 * 24 * 7;
const RECENT_HOOKS_MAX = 50;
const DEFAULT_TONE_LEVEL = 3;

const TONE_DESCRIPTIONS: Record<number, string> = {
  1: "Very informal, uses texting lingo, and uses lots of exclamation points",
  2: "Informal, warm, relaxed, approachable voice, uses some exclamation points",
  3: "Conversational, casual-professional tone, clear and concise, uses some exclamation points",
  4: "Formal, polished, authoritative tone with minimal slang",
  5: "Very formal, highly professional and structured voice"
};

const OUTPUT_LOGS_DIR = "src/lib/prompts/logs";

const CONTENT_ITEM_SCHEMA = {
  type: "object",
  properties: {
    hook: { type: "string" },
    hook_subheader: { anyOf: [{ type: "string" }, { type: "null" }] },
    body: {
      anyOf: [
        { type: "null" },
        {
          type: "array",
          items: {
            type: "object",
            properties: {
              header: { type: "string" },
              content: { type: "string" }
            },
            required: ["header", "content"],
            additionalProperties: false
          }
        }
      ]
    },
    cta: { anyOf: [{ type: "string" }, { type: "null" }] },
    caption: { type: "string" }
  },
  required: ["hook", "hook_subheader", "body", "cta", "caption"],
  additionalProperties: false
};

const OUTPUT_FORMAT = {
  type: "json_schema",
  schema: {
    type: "array",
    items: CONTENT_ITEM_SCHEMA,
    minItems: 1
  }
};

function shouldWritePromptLog(): boolean {
  return process.env.NODE_ENV === "development" && !process.env.VERCEL;
}

async function writePromptLog(payload: {
  userId: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<void> {
  if (!shouldWritePromptLog()) {
    return;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${timestamp}_${payload.userId}.txt`;
  const outputDir = path.join(process.cwd(), OUTPUT_LOGS_DIR);
  const outputPath = path.join(outputDir, filename);
  const content = [
    "=== SYSTEM PROMPT ===",
    payload.systemPrompt,
    "",
    "=== USER PROMPT ===",
    payload.userPrompt,
    ""
  ].join("\n");

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, content, "utf8");
}


type ClaudeMessage = {
  role: "user";
  content: string;
};

type StreamEvent =
  | { type: "delta"; text: string }
  | {
      type: "done";
      items: unknown[];
      meta: { model: string; batch_size: number };
    }
  | { type: "error"; message: string };

let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) {
    return redisClient;
  }

  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;

  if (!url || !token) {
    logger.warn(
      { hasUrl: Boolean(url), hasToken: Boolean(token) },
      "Upstash Redis env vars missing; cache disabled"
    );
    redisClient = null;
    return redisClient;
  }

  redisClient = new Redis({ url, token });
  logger.info("Upstash Redis client initialized");
  return redisClient;
}

function getRecentHooksKey(userId: string, category: string): string {
  return `recent_hooks:${userId}:${category}`;
}

const COMMUNITY_CATEGORY_KEYS = [
  "neighborhoods_list",
  "dining_list",
  "coffee_brunch_list",
  "nature_outdoors_list",
  "entertainment_list",
  "attractions_list",
  "sports_rec_list",
  "arts_culture_list",
  "nightlife_social_list",
  "fitness_wellness_list",
  "shopping_list",
  "education_list",
  "community_events_list"
];

type CommunityCategoryKey = string;

function getCommunityCategoryCycleKey(userId: string): string {
  return `community_category_cycle:${userId}`;
}

function shuffleArray<T>(values: readonly T[]): T[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function selectCommunityCategories(
  redis: Redis | null,
  userId: string,
  count: number,
  availableKeys: CommunityCategoryKey[]
): Promise<CommunityCategoryKey[]> {
  if (availableKeys.length === 0) {
    return [];
  }
  if (!redis) {
    return shuffleArray(availableKeys).slice(0, count);
  }

  const key = getCommunityCategoryCycleKey(userId);
  let remaining: CommunityCategoryKey[] | null = null;

  try {
    const cached = await redis.get<CommunityCategoryKey[]>(key);
    if (Array.isArray(cached)) {
      remaining = cached.filter((item) => availableKeys.includes(item));
    }
  } catch (error) {
    logger.warn(
      { userId, error: error instanceof Error ? error.message : String(error) },
      "Failed to read community category cycle cache"
    );
  }

  if (!remaining || remaining.length === 0) {
    remaining = shuffleArray(availableKeys);
  }

  let selected: CommunityCategoryKey[] = [];
  if (remaining.length >= count) {
    selected = remaining.slice(0, count);
    remaining = remaining.slice(count);
  } else {
    const carry = [...remaining];
    let refill = shuffleArray(availableKeys);
    if (carry.length === 1 && refill.length > 1 && refill[0] === carry[0]) {
      refill = refill.slice(1).concat(refill[0]);
    }
    const need = count - carry.length;
    selected = carry.concat(refill.slice(0, need));
    remaining = refill.slice(need);
  }

  try {
    await redis.set(key, remaining);
  } catch (error) {
    logger.warn(
      { userId, error: error instanceof Error ? error.message : String(error) },
      "Failed to write community category cycle cache"
    );
  }

  return selected;
}

type UserAdditionalSnapshot = {
  targetAudiences: string[] | null;
  location: string | null;
  writingToneLevel: number | null;
  writingStyleCustom: string | null;
  agentName: string;
  brokerageName: string;
  county: string | null;
  serviceAreas: string[] | null;
};

async function getUserAdditionalSnapshot(
  userId: string
): Promise<UserAdditionalSnapshot> {
  const [record] = await db
    .select({
      targetAudiences: userAdditional.targetAudiences,
      location: userAdditional.location,
      writingToneLevel: userAdditional.writingToneLevel,
      writingStyleCustom: userAdditional.writingStyleCustom,
      agentName: userAdditional.agentName,
      brokerageName: userAdditional.brokerageName,
      county: userAdditional.county,
      serviceAreas: userAdditional.serviceAreas
    })
    .from(userAdditional)
    .where(eq(userAdditional.userId, userId));

  return {
    targetAudiences: record?.targetAudiences ?? null,
    location: record?.location ?? null,
    writingToneLevel: record?.writingToneLevel ?? null,
    writingStyleCustom: record?.writingStyleCustom ?? null,
    agentName: record?.agentName ?? "",
    brokerageName: record?.brokerageName ?? "",
    county: record?.county ?? null,
    serviceAreas: record?.serviceAreas ?? null
  };
}

function parsePrimaryAudienceSegments(
  targetAudiences: string[] | null
): string[] {
  if (!targetAudiences || targetAudiences.length === 0) {
    return [];
  }

  return [String(targetAudiences[0])];
}

function getClaudeApiKey(): string {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ApiError(500, {
      error: "Missing configuration",
      message: "ANTHROPIC_API_KEY is not configured"
    });
  }
  return apiKey;
}

function parseJsonArray(text: string) {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "");
  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
    if (start === -1 || end === -1 || end <= start) {
      throw error;
    }
    const slice = trimmed.slice(start, end + 1);
    return JSON.parse(slice);
  }
}

function buildSseMessage(event: StreamEvent): Uint8Array {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  return new TextEncoder().encode(payload);
}

function extractTextDelta(payload: {
  type?: string;
  delta?: { type?: string; text?: string };
}): string | null {
  if (payload.type !== "content_block_delta") {
    return null;
  }
  if (payload.delta?.type !== "text_delta") {
    return null;
  }
  return payload.delta.text ?? null;
}

function validateGeneratedItems(items: unknown): asserts items is unknown[] {
  if (!Array.isArray(items)) {
    throw new ApiError(502, {
      error: "Invalid response",
      message: "Claude response was not a JSON array"
    });
  }

  if (items.length === 0) {
    throw new ApiError(502, {
      error: "Invalid response",
      message: "Claude response did not contain any items"
    });
  }
}

function buildWritingStyleDescription(
  preset: number | string | null,
  custom: string | null
): string {
  const DEFAULT_STYLE =
    "Friendly, conversational, and professional with clear, concise language";

  if (!preset && !custom) {
    return DEFAULT_STYLE;
  }

  const parts: string[] = [];

  if (preset !== null && preset !== undefined && preset !== "") {
    const numeric = normalizeToneLevel(Number(preset));
    parts.push(TONE_DESCRIPTIONS[numeric] || DEFAULT_STYLE);
  }

  if (custom) {
    parts.push(custom);
  }

  return parts.join(". ");
}

function normalizeToneLevel(level: number | null): number {
  if (level === null || Number.isNaN(level)) {
    return DEFAULT_TONE_LEVEL;
  }
  if (level < 1 || level > 5) {
    return DEFAULT_TONE_LEVEL;
  }
  return Math.round(level);
}

function getWritingToneLabel(level: number | null): string {
  const normalized = normalizeToneLevel(level);
  return TONE_DESCRIPTIONS[normalized] || TONE_DESCRIPTIONS[DEFAULT_TONE_LEVEL];
}

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

    const userAdditionalSnapshot = await getUserAdditionalSnapshot(user.id);
    const audienceSegments = parsePrimaryAudienceSegments(
      userAdditionalSnapshot.targetAudiences
    );
    const redis = getRedisClient();
    const recentHooksKey = getRecentHooksKey(user.id, body.category);
    const recentHooks = redis
      ? await redis.lrange<string>(recentHooksKey, 0, RECENT_HOOKS_MAX - 1)
      : [];

    const marketLocation = parseMarketLocation(userAdditionalSnapshot.location);
    let marketData = null;
    let communityData = null;
    let cityDescription = null;
    let communityCategoryKeys: CommunityCategoryKey[] | null = null;

    if (body.category === "market_insights") {
      if (!marketLocation) {
        throw new ApiError(400, {
          error: "Missing market location",
          message:
            "Please add a valid US location and zip code to your profile."
        });
      }

      marketData = await getRentCastMarketData(marketLocation);
      if (!marketData) {
        throw new ApiError(500, {
          error: "Market data unavailable",
          message: "RentCast is not configured. Please try again later."
        });
      }
    }
    if (body.category === "community" && marketLocation) {
      communityData = await getCommunityDataByZipAndAudience(
        marketLocation.zip_code,
        audienceSegments[0],
        userAdditionalSnapshot.serviceAreas,
        marketLocation.city,
        marketLocation.state
      );
    }

    if (body.category === "community" && communityData) {
      const seasonalSections = communityData.seasonal_geo_sections ?? {};
      const seasonalKeys = Object.entries(seasonalSections)
        .filter(([, value]) => {
          if (!value) {
            return false;
          }
          const normalized = value.trim().toLowerCase();
          return normalized !== "" && !normalized.includes("(none found)");
        })
        .map(([key]) => key);
      const availableKeys = COMMUNITY_CATEGORY_KEYS.filter((key) => {
        const value = (communityData as Record<string, unknown>)[key];
        if (typeof value !== "string") {
          return false;
        }
        const normalized = value.trim().toLowerCase();
        return normalized !== "" && !normalized.includes("(none found)");
      }).concat(seasonalKeys);
      const selectedKeys = await selectCommunityCategories(
        redis,
        user.id,
        2,
        availableKeys
      );
      communityCategoryKeys = selectedKeys;
    }

    if (body.category === "community" || body.category === "seasonal") {
      const city = marketLocation?.city ?? body.agent_profile.city;
      const state = marketLocation?.state ?? body.agent_profile.state;
      cityDescription = await getCityDescription(city, state);
    }

    // Enhance agent profile with user's data from database
    const writingToneLevel = normalizeToneLevel(
      userAdditionalSnapshot.writingToneLevel
    );
    const writingToneLabel = getWritingToneLabel(writingToneLevel);

    const enhancedAgentProfile = {
      ...body.agent_profile,
      agent_name:
        userAdditionalSnapshot.agentName || body.agent_profile.agent_name,
      brokerage_name:
        userAdditionalSnapshot.brokerageName ||
        body.agent_profile.brokerage_name,
      zip_code: body.agent_profile.zip_code,
      county: userAdditionalSnapshot.county ?? "",
      service_areas: userAdditionalSnapshot.serviceAreas?.join(", ") ?? "",
      writing_tone_level: writingToneLevel,
      writing_tone_label: writingToneLabel,
      writing_style_description: buildWritingStyleDescription(
        writingToneLevel,
        null
      ),
      writing_style_notes: userAdditionalSnapshot.writingStyleCustom ?? null
    };

    const promptInput: PromptAssemblyInput = {
      ...body,
      agent_profile: enhancedAgentProfile,
      audience_segments: audienceSegments,
      recent_hooks: recentHooks,
      market_data: marketData,
      community_data: communityData,
      community_data_extra_sections:
        communityData?.seasonal_geo_sections ?? null,
      city_description: cityDescription,
      community_category_keys: communityCategoryKeys
    };

    const systemPrompt = await buildSystemPrompt(promptInput);
    const userPrompt = buildUserPrompt(promptInput);
    await writePromptLog({
      userId: user.id,
      systemPrompt,
      userPrompt
    });

    const messages: ClaudeMessage[] = [
      {
        role: "user",
        content: userPrompt
      }
    ];

    const response = await fetch(CLAUDE_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": getClaudeApiKey(),
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "structured-outputs-2025-11-13"
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 2800,
        system: systemPrompt,
        messages,
        stream: true,
        output_format: OUTPUT_FORMAT
      })
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => ({}));
      logger.error(
        { status: response.status, errorPayload },
        "Claude API error"
      );
      throw new ApiError(response.status, {
        error: "Upstream error",
        message: "Claude API request failed"
      });
    }

    const upstream = response.body;
    if (!upstream) {
      throw new ApiError(502, {
        error: "Invalid response",
        message: "Claude response stream missing"
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
                  buildSseMessage({ type: "delta", text: deltaText })
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
              "Failed to parse Claude response"
            );
            controller.enqueue(
              buildSseMessage({
                type: "error",
                message: "Claude response could not be parsed as JSON"
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
            buildSseMessage({
              type: "done",
              items: parsed as unknown[],
              meta: {
                model: CLAUDE_MODEL,
                batch_size: (parsed as unknown[]).length
              }
            })
          );
          controller.close();
        } catch (error) {
          logger.error({ error }, "Streaming error");
          controller.enqueue(
            buildSseMessage({
              type: "error",
              message: "Failed to stream response"
            })
          );
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
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
