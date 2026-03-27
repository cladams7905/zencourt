import type { InsertDBContent } from "@db/types/models";

export type CreateContentInput = Omit<
  InsertDBContent,
  "id" | "userId" | "createdAt" | "updatedAt"
> & { id?: string };

export type ContentUpdates = Partial<
  Omit<InsertDBContent, "id" | "listingId" | "createdAt">
>;
