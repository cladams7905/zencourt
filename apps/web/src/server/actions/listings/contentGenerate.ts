"use server";

import {
  runListingContentGenerate,
  type GenerateListingContentBody
} from "@web/src/server/services/listingContentGeneration";
import { requireAuthenticatedUser } from "@web/src/server/auth/apiAuth";

export type { GenerateListingContentBody };

export async function generateListingContentForCurrentUser(
  listingId: string,
  body: GenerateListingContentBody | null
) {
  const user = await requireAuthenticatedUser();
  return runListingContentGenerate(listingId, user.id, body);
}
