import type { DBUserMedia, UserMediaType } from "@db/types/models";

export interface MediaViewProps {
  initialMedia?: DBUserMedia[];
}

export type MediaUsageSort = "none" | "most-used" | "least-used";

export interface CreateMediaRecordInput {
  key: string;
  type: UserMediaType;
  thumbnailKey?: string;
}
