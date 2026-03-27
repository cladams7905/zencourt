"use client";

import * as React from "react";
import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";

function getSiblingSubcategories(activeSubcategory: ListingContentSubcategory) {
  return LISTING_CONTENT_SUBCATEGORIES.filter(
    (subcategory) => subcategory !== activeSubcategory
  );
}

function getOppositeMediaTab(
  activeMediaTab: ListingCreateMediaTab
): ListingCreateMediaTab {
  return activeMediaTab === "videos" ? "images" : "videos";
}

export function useListingContentWarmup(params: {
  listingId: string;
  activeMediaTab: ListingCreateMediaTab;
  activeSubcategory: ListingContentSubcategory;
  fetchFirstPageForFilter: (
    mediaTab: ListingCreateMediaTab,
    subcategory: ListingContentSubcategory
  ) => Promise<void> | void;
}) {
  const { listingId, activeMediaTab, activeSubcategory, fetchFirstPageForFilter } =
    params;

  React.useEffect(() => {
    let cancelled = false;

    const warmCurrentMediaSiblings = async () => {
      await Promise.all(
        getSiblingSubcategories(activeSubcategory).map((subcategory) =>
          fetchFirstPageForFilter(activeMediaTab, subcategory)
        )
      );
    };

    const warmOppositeMedia = async () => {
      const oppositeMediaTab = getOppositeMediaTab(activeMediaTab);
      await Promise.all(
        LISTING_CONTENT_SUBCATEGORIES.map((subcategory) =>
          fetchFirstPageForFilter(oppositeMediaTab, subcategory)
        )
      );
    };

    void warmCurrentMediaSiblings().then(() => {
      if (cancelled) {
        return;
      }

      setTimeout(() => {
        if (cancelled) {
          return;
        }
        void warmOppositeMedia();
      }, 0);
    });

    return () => {
      cancelled = true;
    };
  }, [activeMediaTab, activeSubcategory, fetchFirstPageForFilter, listingId]);
}
