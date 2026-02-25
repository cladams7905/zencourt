"use server";

import { requireAuthenticatedUser } from "@web/src/server/auth/apiAuth";
import { runContentGenerationForUser } from "@web/src/server/actions/contentGeneration/helpers";
import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";
import { DomainValidationError } from "@web/src/server/errors/domain";

export async function generateContentForCurrentUser(
  body: PromptAssemblyInput | null
) {
  if (!body?.category) {
    throw new DomainValidationError("category is required");
  }
  if (!body.agent_profile) {
    throw new DomainValidationError("agent_profile is required");
  }

  const user = await requireAuthenticatedUser();
  return runContentGenerationForUser(user.id, body);
}
