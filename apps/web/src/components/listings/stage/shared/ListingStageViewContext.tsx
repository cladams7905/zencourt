"use client";

import * as React from "react";
import type { ListingStage } from "@db/types/models";
import type { ListingStageKey } from "@web/src/components/listings/stage";

type ListingStageViewContextValue = {
  stage: ListingStageKey;
  title: string;
  subtitle?: string;
  listingView: boolean;
  hideCreateButton?: boolean;
  /** Set when editing an existing listing (all listing-view stages except create). */
  listingId?: string | null;
  /** Persisted listing stage from the database; used for draft badge and nav. */
  listingDbStage?: ListingStage | null;
};

const ListingStageViewContext =
  React.createContext<ListingStageViewContextValue | null>(null);

type ListingStageViewProviderProps = ListingStageViewContextValue & {
  children: React.ReactNode;
};

export function ListingStageViewProvider({
  stage,
  title,
  subtitle,
  listingView,
  hideCreateButton,
  listingId,
  listingDbStage,
  children
}: ListingStageViewProviderProps) {
  const value = React.useMemo(
    () => ({
      stage,
      title,
      subtitle,
      listingView,
      hideCreateButton,
      listingId,
      listingDbStage
    }),
    [
      hideCreateButton,
      listingDbStage,
      listingId,
      listingView,
      stage,
      subtitle,
      title
    ]
  );

  return (
    <ListingStageViewContext.Provider value={value}>
      <div className="flex h-full min-h-0 w-full flex-col">{children}</div>
    </ListingStageViewContext.Provider>
  );
}

export function useListingStageViewContext() {
  const context = React.useContext(ListingStageViewContext);
  if (!context) {
    throw new Error(
      "useListingStageViewContext must be used within ListingStageViewProvider."
    );
  }
  return context;
}
