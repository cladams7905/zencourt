"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { requireListingAccess } from "@web/src/server/models/listings/access";
import { getVideoGenBatchById } from "@web/src/server/models/videoGen";
import { getVideoGenerationStatus as getVideoGenerationStatusService } from "@web/src/server/services/videoGeneration";
import { getPublicDownloadUrlSafe } from "@web/src/server/services/storage/urlResolution";
import { DomainValidationError } from "@web/src/server/errors/domain";

export const getVideoGenerationStatus = withServerActionCaller(
  "getVideoGenerationStatus",
  async (batchId: string) => {
    const user = await requireAuthenticatedUser();
    const batch = await getVideoGenBatchById(batchId);
    if (!batch) {
      throw new DomainValidationError("batchId is invalid");
    }
    await requireListingAccess(batch.listingId, user.id);
    return getVideoGenerationStatusService(batchId, getPublicDownloadUrlSafe);
  }
);
