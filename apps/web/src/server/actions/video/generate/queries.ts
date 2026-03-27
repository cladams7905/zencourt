"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { withCurrentUserListingAccess } from "@web/src/server/actions/shared/auth";
import { getVideoGenBatchById } from "@web/src/server/models/video";
import { getVideoGenerationStatus as getVideoGenerationStatusService } from "@web/src/server/services/videoGeneration";
import { getPublicDownloadUrlSafe } from "@web/src/server/services/storage/urlResolution";
import { DomainValidationError } from "@web/src/server/errors/domain";

export const getVideoGenerationStatus = withServerActionCaller(
  "getVideoGenerationStatus",
  async (batchId: string) =>
    withCurrentUserListingAccess(
      async () => {
        const batch = await getVideoGenBatchById(batchId);
        if (!batch) {
          throw new DomainValidationError("batchId is invalid");
        }
        return batch.listingId;
      },
      async () =>
        getVideoGenerationStatusService(batchId, getPublicDownloadUrlSafe)
    )
);
