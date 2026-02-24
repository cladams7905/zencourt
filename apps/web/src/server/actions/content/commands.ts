"use server";

import { requireAuthenticatedUser } from "@web/src/server/auth/apiAuth";
import { runContentGeneration } from "@web/src/server/services/contentGeneration";
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
  return runContentGeneration(user.id, body);
}
