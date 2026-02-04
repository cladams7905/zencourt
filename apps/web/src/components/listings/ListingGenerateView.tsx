"use client";

import { ListingViewHeader } from "./ListingViewHeader";
import React from "react";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";

type ListingGenerateViewProps = {
  listingId: string;
  title: string;
};

export function ListingGenerateView({
  listingId,
  title
}: ListingGenerateViewProps) {
  React.useEffect(() => {
    emitListingSidebarUpdate({
      id: listingId,
      listingStage: "generate",
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId]);

  return (
    <>
      <ListingViewHeader title={title} />
      <p>Generate page</p>
    </>
  );
}
