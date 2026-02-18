import type { ListingSummaryItem } from "@web/src/components/listings/my-listings/shared";

type FetchListingsResponse = {
  items: ListingSummaryItem[];
  hasMore: boolean;
};

export const fetchListingsPage = async ({
  offset,
  limit
}: {
  offset: number;
  limit: number;
}): Promise<FetchListingsResponse> => {
  const response = await fetch(
    `/api/v1/listings?offset=${offset}&limit=${limit}`
  );
  if (!response.ok) {
    throw new Error("Failed to load more listings.");
  }

  return response.json() as Promise<FetchListingsResponse>;
};
