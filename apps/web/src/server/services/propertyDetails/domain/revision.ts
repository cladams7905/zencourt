import { createHash } from "crypto";
import type { ListingPropertyDetails } from "@shared/types/models";

export function buildPropertyDetailsRevision(
  details: ListingPropertyDetails
): string {
  return createHash("sha256").update(JSON.stringify(details)).digest("hex");
}
