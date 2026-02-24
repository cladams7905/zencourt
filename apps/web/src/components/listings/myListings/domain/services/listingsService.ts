import type { ListingSummaryItem } from "@web/src/components/listings/myListings/shared";
import { fetchJson } from "@web/src/lib/client/http";

type FetchListingsResponse = {
  items: ListingSummaryItem[];
  hasMore: boolean;
};

export const fetchListingsPage = async (url: string): Promise<FetchListingsResponse> => {
  try {
    return await fetchJson<FetchListingsResponse>(url);
  } catch {
    throw new Error("Failed to load more listings.");
  }
};

export const buildListingsPageUrl = ({
  offset,
  limit
}: {
  offset: number;
  limit: number;
}) => `/api/v1/listings?offset=${offset}&limit=${limit}`;
