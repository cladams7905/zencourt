"use server";

import { consumeSseStream } from "@web/src/lib/sse/sseEventStream";
import { runContentGenerationForUser } from "@web/src/server/actions/content/generate/helpers";
import { buildUpstreamRequestBody } from "@web/src/server/actions/listings/content/generate/upstream";
import { resolveListingContext } from "@web/src/server/actions/listings/content/generate/listingContext";
import { DomainValidationError } from "@web/src/server/errors/domain";
import { getContentById } from "@web/src/server/models/content";
import {
  isSavedListingReelMetadata,
  type RegenerateListingVideoReelTextParams,
  type RegenerateListingVideoReelTextResult,
  type ReelTextRegenerationField,
  type ReelTextRegenerationMode
} from "@web/src/lib/domain/listings/content/reels";
import type { PlayablePreviewSaveTarget } from "@web/src/lib/domain/listings/content/create";
import type { ReelSequenceItem } from "@web/src/lib/domain/listings/content";
import { generateTextForUseCase } from "@web/src/server/services/ai";

type ListingRow = {
  id: string;
  userId: string;
  address?: string | null;
  propertyDetails?: unknown;
};

function normalizeTargetField(
  value: string
): ReelTextRegenerationField {
  if (value === "hook" || value === "caption") {
    return value;
  }
  throw new DomainValidationError("Target field must be hook or caption.");
}

function normalizeMode(value: string): ReelTextRegenerationMode {
  if (value === "random" || value === "custom") {
    return value;
  }
  throw new DomainValidationError("Regeneration mode must be random or custom.");
}

async function resolveListingSubcategory(params: {
  userId: string;
  listingId: string;
  saveTarget: PlayablePreviewSaveTarget;
}) {
  if (params.saveTarget.contentSource === "cached_create") {
    return params.saveTarget.subcategory;
  }

  const existing = await getContentById(params.userId, params.saveTarget.savedContentId);
  if (!existing || existing.listingId !== params.listingId) {
    throw new DomainValidationError("Saved reel not found.");
  }
  if (!isSavedListingReelMetadata(existing.metadata)) {
    throw new DomainValidationError("Saved reel metadata is invalid.");
  }
  return existing.metadata.listingSubcategory;
}

function buildRandomRegenerationNotes(
  params: RegenerateListingVideoReelTextParams
) {
  const preservedField =
    params.targetField === "hook"
      ? `Current caption to preserve context: ${params.currentCaption || "None"}`
      : `Current header to preserve context: ${params.currentHook || "None"}`;

  return [
    `Regenerate only the ${params.targetField === "hook" ? "hook" : "caption"} for this listing reel.`,
    "Return one item only.",
    preservedField,
    `Clip order: ${params.orderedClipIds.join(", ")}`
  ].join("\n");
}

function buildCustomSystemPrompt(targetField: ReelTextRegenerationField) {
  return [
    "Generate compliant real estate marketing copy for a listing reel.",
    "Follow fair housing and advertising compliance requirements.",
    `Return valid JSON only with this schema: {"value":"string"}.`,
    `The value must contain only the requested ${targetField === "hook" ? "header" : "caption"}.`
  ].join("\n");
}

function buildCustomUserPrompt(params: {
  input: RegenerateListingVideoReelTextParams;
  subcategory: string;
}) {
  const { input, subcategory } = params;
  const directions = input.customDirections?.trim() ?? "";

  return [
    `Requested field: ${input.targetField}`,
    `Listing subcategory: ${subcategory}`,
    `Current header: ${input.currentHook || "None"}`,
    `Current caption: ${input.currentCaption || "None"}`,
    `Clip order: ${input.orderedClipIds.join(", ") || "None"}`,
    `Sequence summary: ${input.sequence
      .map(
        (item) =>
          `${item.sourceType}:${item.sourceId}:${Number(item.durationSeconds.toFixed(2))}s`
      )
      .join(", ")}`,
    `User directions: ${directions}`
  ].join("\n");
}

async function runCustomRegeneration(params: {
  input: RegenerateListingVideoReelTextParams;
  subcategory: string;
}): Promise<string> {
  const result = await generateTextForUseCase({
    useCase: "content_generation_stream",
    system: buildCustomSystemPrompt(params.input.targetField),
    messages: [
      {
        role: "user",
        content: buildCustomUserPrompt(params)
      }
    ],
    responseFormat: {
      type: "json_schema",
      json_schema: {
        name: "reel_field_regeneration",
        schema: {
          type: "object",
          properties: {
            value: { type: "string" }
          },
          required: ["value"],
          additionalProperties: false
        }
      }
    }
  });

  let parsed: { value?: string } | null = null;
  try {
    parsed = result?.text ? (JSON.parse(result.text) as { value?: string }) : null;
  } catch {
    throw new DomainValidationError("Failed to parse regenerated reel text.");
  }

  const value = parsed?.value?.trim();
  if (!value) {
    throw new DomainValidationError(
      `Generated ${params.input.targetField} is required.`
    );
  }

  return value;
}

export async function regenerateListingVideoReelTextForUser(params: {
  userId: string;
  listing: ListingRow;
  listingId: string;
  input: RegenerateListingVideoReelTextParams;
}): Promise<RegenerateListingVideoReelTextResult> {
  const targetField = normalizeTargetField(params.input.targetField);
  let mode = normalizeMode(params.input.mode);
  if (mode === "custom" && !(params.input.customDirections?.trim() ?? "")) {
    mode = "random";
  }

  const subcategory = await resolveListingSubcategory({
    userId: params.userId,
    listingId: params.listingId,
    saveTarget: params.input.saveTarget
  });
  const context = resolveListingContext(params.listing, {
    listingId: params.listingId,
    subcategory,
    mediaType: "video",
    focus: `Regenerate the ${targetField === "hook" ? "header" : "caption"} for this reel.`,
    notes: buildRandomRegenerationNotes(params.input),
    generationNonce: "",
    generationCount: 1,
    templateId: ""
  });
  let resultValue = "";

  if (mode === "custom") {
    resultValue = await runCustomRegeneration({
      input: {
        ...params.input,
        targetField
      },
      subcategory
    });
  } else {
    const upstream = buildUpstreamRequestBody(context);
    const response = await runContentGenerationForUser(params.userId, upstream);

    let didReceiveDone = false;

    await consumeSseStream<{
      type?: string;
      message?: string;
      items?: Array<{ hook?: string; caption?: string }>;
    }>(response.stream as ReadableStream<Uint8Array>, async (event) => {
      if (event.type === "error") {
        throw new DomainValidationError(
          event.message || "Failed to regenerate reel text."
        );
      }
      if (event.type !== "done") {
        return;
      }
      const nextValue = event.items?.[0]?.[targetField]?.trim();
      if (!nextValue) {
        throw new DomainValidationError(
          `Generated ${targetField} is required.`
        );
      }
      resultValue = nextValue;
      didReceiveDone = true;
    });

    if (!didReceiveDone || !resultValue) {
      throw new DomainValidationError("Failed to regenerate reel text.");
    }
  }

  return {
    targetField,
    value: resultValue
  };
}
