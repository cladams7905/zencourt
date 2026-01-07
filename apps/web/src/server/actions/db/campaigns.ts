"use server";

import { nanoid } from "nanoid";
import { eq, and, like, desc } from "drizzle-orm";
import { db, campaigns, content } from "@db/client";
import { DBCampaign, InsertDBCampaign } from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";
import { ensurePublicUrlSafe } from "../../utils/storageUrls";

type ContentRecord = typeof content.$inferSelect;

const CAMPAIGN_THUMBNAIL_TTL_SECONDS = 6 * 60 * 60; // 6 hours

async function resolveThumbnailUrl(
  url?: string | null
): Promise<string | null> {
  if (!url) {
    return url ?? null;
  }
  const signed = await ensurePublicUrlSafe(
    url,
    CAMPAIGN_THUMBNAIL_TTL_SECONDS
  );
  return signed ?? url ?? null;
}

async function withSignedContentThumbnails(
  contentList: ContentRecord[]
): Promise<ContentRecord[]> {
  if (!contentList || contentList.length === 0) {
    return contentList;
  }
  return Promise.all(
    contentList.map(async (item) => ({
      ...item,
      thumbnailUrl: await resolveThumbnailUrl(item.thumbnailUrl)
    }))
  );
}

/**
 * Create a new campaign
 * Server action that creates a campaign in the database
 *
 * @returns Promise<DBCampaign> - The created campaign
 * @throws Error if user is not authenticated or campaign creation fails
 */
export async function createCampaign(userId: string): Promise<DBCampaign> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to create a campaign");
  }

  return withDbErrorHandling(
    async () => {
      return db.transaction(async (tx) => {
        const campaignId = nanoid();
        const [newCampaign] = await tx
          .insert(campaigns)
          .values({
            id: campaignId,
            userId
          })
          .returning();

        const [primaryContent] = await tx
          .insert(content)
          .values({
            id: nanoid(),
            campaignId,
            userId,
            contentType: "video",
            status: "draft"
          })
          .returning();

        return {
          ...newCampaign,
          primaryContentId: primaryContent.id,
          thumbnailUrl: primaryContent.thumbnailUrl,
          contents: [primaryContent]
        };
      });
    },
    {
      actionName: "createCampaign",
      errorMessage: "Failed to create campaign. Please try again."
    }
  );
}

/**
 * Update campaign
 * Server action that updates one or more fields of a campaign
 *
 * @param campaignId - The ID of the campaign to update
 * @param updates - Partial campaign object with fields to update
 * @returns Promise<DBCampaign> - The updated campaign
 * @throws Error if user is not authenticated or update fails
 */
export async function updateCampaign(
  userId: string,
  campaignId: string,
  updates: Partial<Omit<InsertDBCampaign, "id" | "userId" | "createdAt">>
): Promise<DBCampaign> {
  if (!campaignId || campaignId.trim() === "") {
    throw new Error("Campaign ID is required");
  }
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update a campaign");
  }

  return withDbErrorHandling(
    async () => {
      const [updatedCampaign] = await db
        .update(campaigns)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(and(eq(campaigns.id, campaignId), eq(campaigns.userId, userId)))
        .returning();

      if (!updatedCampaign) {
        throw new Error("Campaign not found");
      }

      return updatedCampaign;
    },
    {
      actionName: "updateCampaign",
      context: { campaignId },
      errorMessage: "Failed to update campaign. Please try again."
    }
  );
}

/**
 * Get all campaigns for the current user
 * Server action that retrieves all campaigns belonging to the authenticated user
 *
 * @returns Promise<DBCampaign[]> - Array of user's campaigns
 * @throws Error if user is not authenticated
 */
export async function getUserCampaigns(
  userId: string
): Promise<DBCampaign[]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch campaigns");
  }

  return withDbErrorHandling(
    async () => {
      const rows = await db
        .select({
          campaign: campaigns,
          content: content
        })
        .from(campaigns)
        .leftJoin(content, eq(content.campaignId, campaigns.id))
        .where(eq(campaigns.userId, userId))
        .orderBy(desc(campaigns.createdAt));

      const campaignMap = new Map<
        string,
        {
          campaign: (typeof campaigns.$inferSelect);
          contents: ContentRecord[];
        }
      >();

      for (const { campaign, content: contentRow } of rows) {
        let entry = campaignMap.get(campaign.id);
        if (!entry) {
          entry = {
            campaign,
            contents: []
          };
          campaignMap.set(campaign.id, entry);
        }

        if (contentRow) {
          const alreadyExists = entry.contents.some(
            (existing) => existing.id === contentRow.id
          );
          if (!alreadyExists) {
            entry.contents.push(contentRow);
          }
        }
      }

      const aggregatedCampaigns = Array.from(campaignMap.values()).map(
        ({ campaign, contents }) => {
          const primaryContent = contents.reduce<ContentRecord | null>(
            (latest, current) => {
              if (!latest) return current;
              const latestTime = latest.updatedAt
                ? new Date(latest.updatedAt).getTime()
                : 0;
              const currentTime = current.updatedAt
                ? new Date(current.updatedAt).getTime()
                : 0;
              return currentTime > latestTime ? current : latest;
            },
            null
          );

          return {
            ...campaign,
            primaryContentId: primaryContent?.id ?? null,
            thumbnailUrl: primaryContent?.thumbnailUrl ?? null,
            contents
          };
        }
      );

      return Promise.all(
        aggregatedCampaigns.map(async (campaign) => {
          const signedContent = await withSignedContentThumbnails(
            campaign.contents ?? []
          );
          return {
            ...campaign,
            contents: signedContent,
            thumbnailUrl: await resolveThumbnailUrl(campaign.thumbnailUrl)
          };
        })
      );
    },
    {
      actionName: "getUserCampaigns",
      errorMessage: "Failed to fetch campaigns. Please try again."
    }
  );
}

/**
 * Get the next draft number for the user
 * Counts existing draft campaigns and returns the next sequential number
 *
 * @returns Promise<number> - The next draft number
 * @throws Error if user is not authenticated
 */
export async function getNextDraftNumber(userId: string): Promise<number> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch draft numbers");
  }

  return withDbErrorHandling(
    async () => {
      // Get all campaigns with titles starting with "Draft "
      const draftCampaigns = await db
        .select()
        .from(campaigns)
        .where(and(eq(campaigns.userId, userId), like(campaigns.title, "Draft %")));

      // Extract draft numbers and find the highest
      const draftNumbers = draftCampaigns
        .map((p) => {
          const match = p.title?.match(/^Draft (\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        })
        .filter((num) => !isNaN(num));

      const maxDraftNumber =
        draftNumbers.length > 0 ? Math.max(...draftNumbers) : 0;

      return maxDraftNumber + 1;
    },
    {
      actionName: "getNextDraftNumber",
      errorMessage: "Failed to get draft number. Please try again."
    }
  );
}
