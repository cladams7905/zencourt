"use server";

import type { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { requireListingAccess } from "@web/src/server/utils/listingAccess";
import {
  runListingContentGenerate,
  type GenerateListingContentBody
} from "@web/src/server/services/listingContentGeneration";

/**
 * Single entry point for "generate listing content" (listing-scoped, with cache).
 * Used by POST /api/v1/listings/[listingId]/content/generate.
 */
export async function generateListingContent(
  listingId: string,
  body: GenerateListingContentBody | null
): Promise<NextResponse> {
  const user = await requireAuthenticatedUser();
  await requireListingAccess(listingId, user.id);
  return runListingContentGenerate(listingId, user.id, body);
}
