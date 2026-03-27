import type { ListingSummaryItem } from "@web/src/components/listings/myListings/shared";
import { fetchJson } from "@web/src/lib/core/http/client";
import type { OffsetPage } from "@web/src/lib/domain/pagination";

type ListingsPageWire = {
  items: ListingSummaryItem[];
  hasMore: boolean;
};

export type ListingsOffsetPage = OffsetPage<ListingSummaryItem>;

function parseOffset(url: string) {
  try {
    const [, query = ""] = url.split("?");
    const value = Number(new URLSearchParams(query).get("offset"));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

export const fetchListingsPage = async (
  url: string
): Promise<ListingsOffsetPage> => {
  try {
    const data = await fetchJson<ListingsPageWire>(url);
    const offset = parseOffset(url);
    return {
      ...data,
      nextOffset: offset + data.items.length
    };
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
