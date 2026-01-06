import { db, campaigns } from "@db/client";
import { stackServerApp } from "@web/src/lib/stack/server";
import type { CurrentServerUser } from "@stackframe/stack";
import { eq } from "drizzle-orm";

type Campaign = typeof campaigns.$inferSelect;

export class ApiError extends Error {
  constructor(
    public status: number,
    public body: { error: string; message: string }
  ) {
    super(body.message);
    this.name = "ApiError";
  }
}

export async function requireAuthenticatedUser(): Promise<CurrentServerUser> {
  const user = await stackServerApp.getUser();

  if (!user) {
    throw new ApiError(401, {
      error: "Unauthorized",
      message: "Please sign in to continue"
    });
  }

  return user;
}

export async function requireCampaignAccess(
  campaignId: string | null | undefined,
  userId: string
): Promise<Campaign> {
  if (!campaignId) {
    throw new ApiError(400, {
      error: "Invalid request",
      message: "Campaign ID is required"
    });
  }

  const campaignResult = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId))
    .limit(1);

  const campaign = campaignResult[0];

  if (!campaign) {
    throw new ApiError(404, {
      error: "Not found",
      message: "Campaign not found"
    });
  }

  if (campaign.userId !== userId) {
    throw new ApiError(403, {
      error: "Forbidden",
      message: "You don't have access to this campaign"
    });
  }

  return campaign;
}
