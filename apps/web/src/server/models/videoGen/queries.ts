"use server";

import { db, eq, videoGenJobs } from "@db/client";
import type { DBVideoGenJob } from "@db/types/models";
import { requireNonEmptyString } from "../shared/validation";
import { withDbErrorHandling } from "../shared/dbErrorHandling";

export async function getVideoGenJobById(
  jobId: string
): Promise<DBVideoGenJob | null> {
  requireNonEmptyString(jobId, "jobId is required");

  return withDbErrorHandling(
    async () => {
      const [job] = await db
        .select()
        .from(videoGenJobs)
        .where(eq(videoGenJobs.id, jobId))
        .limit(1);

      return job ?? null;
    },
    {
      actionName: "getVideoGenJobById",
      context: { jobId },
      errorMessage: "Failed to load video generation job. Please try again."
    }
  );
}
