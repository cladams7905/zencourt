"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { withCurrentUser } from "@web/src/server/actions/shared/auth";
import { runContentGenerationForUser } from "@web/src/server/actions/content/generate/helpers";
import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";
import { DomainValidationError } from "@web/src/server/errors/domain";

export const generateContentForCurrentUser = withServerActionCaller(
  "generateContentForCurrentUser",
  async (body: PromptAssemblyInput | null) => {
    if (!body?.category) {
      throw new DomainValidationError("category is required");
    }
    if (!body.agent_profile) {
      throw new DomainValidationError("agent_profile is required");
    }

    return withCurrentUser(async ({ user }) =>
      runContentGenerationForUser(user.id, body)
    );
  }
);
