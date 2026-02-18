"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ViewHeader } from "@web/src/components/view/ViewHeader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@web/src/components/ui/table";
import { Button } from "@web/src/components/ui/button";
import {
  ListingRow,
  ListingSkeletonRow
} from "@web/src/components/listings/myListings/components";
import { useListingPagination } from "@web/src/components/listings/myListings/domain";
import { toListingRowViewModel } from "@web/src/components/listings/myListings/domain/myListingsUtils";
import type { MyListingsViewProps } from "@web/src/components/listings/myListings/shared";

export function MyListingsView({
  initialListings,
  initialHasMore
}: MyListingsViewProps) {
  const router = useRouter();
  const {
    listings,
    hasMore,
    isLoadingMore,
    loadError,
    loadMoreRef,
    fetchMoreListings
  } = useListingPagination({
    initialListings,
    initialHasMore
  });

  const rows = React.useMemo(
    () => listings.map((listing) => toListingRowViewModel(listing)),
    [listings]
  );

  return (
    <>
      <ViewHeader
        title="My listings"
        subtitle="Review and jump back into recent listing workflows."
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-8 py-10">
        <div className="rounded-lg border border-border bg-background shadow-xs">
          <Table>
            <TableHeader className="h-14">
              <TableRow>
                <TableHead className="w-[40%] rounded-tl-lg">
                  Listing name
                </TableHead>
                <TableHead>Last opened</TableHead>
                <TableHead>Uploaded images</TableHead>
                <TableHead className="rounded-tr-lg">Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="py-10 text-center text-sm text-muted-foreground"
                  >
                    No listings yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <ListingRow
                    key={row.id}
                    row={row}
                    onOpen={(path) => router.push(path)}
                  />
                ))
              )}
              {isLoadingMore
                ? Array.from({ length: 3 }).map((_, index) => (
                    <ListingSkeletonRow key={`listing-skeleton-${index}`} />
                  ))
                : null}
            </TableBody>
          </Table>
          {loadError ? (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
              <span className="text-destructive">{loadError}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchMoreListings()}
              >
                Retry
              </Button>
            </div>
          ) : null}
          {hasMore ? <div ref={loadMoreRef} className="h-0" /> : null}
        </div>
      </div>
    </>
  );
}
