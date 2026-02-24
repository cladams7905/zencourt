import type { VideoJobWebhookPayload } from "@shared/types/api";
import type { DBVideoGenJob } from "@db/types/models";

export type VideoWebhookPayload = VideoJobWebhookPayload & {
  generation?: {
    roomId?: string;
    roomName?: string;
    sortOrder?: number;
  };
};

export type NormalizedWebhookResult = {
  videoUrl: string | null;
  thumbnailUrl: string | null;
  errorMessage: string | null;
  metadata:
    | (NonNullable<DBVideoGenJob["metadata"]> & {
        duration?: number;
        fileSize?: number;
      })
    | undefined;
};

export type ProcessVideoWebhookResult =
  | { status: "ok" }
  | { status: "not_found" }
  | { status: "update_failed" };
