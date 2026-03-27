"use client";

import * as React from "react";
import type { ListingClipVersionItem } from "@web/src/components/listings/create/shared/types";
import {
  getRegeneratingVersion,
  isClipRegenerating
} from "./regenerationState";

export function getDisplayThumbnail(item?: ListingClipVersionItem | null) {
  if (!item) {
    return null;
  }

  if (isClipRegenerating(getRegeneratingVersion(item)?.versionStatus)) {
    return item.currentVersion.thumbnail ?? item.versions[0]?.thumbnail ?? null;
  }

  return item.currentVersion.thumbnail ?? null;
}

export function buildClipDownloadHref(
  listingId: string,
  clipVersionId: string
) {
  return `/api/v1/listings/${listingId}/clips/${clipVersionId}/download`;
}

export function serializeClipItems(itemsToSerialize: ListingClipVersionItem[]) {
  return JSON.stringify(
    itemsToSerialize.map((item) => ({
      clipId: item.clipId,
      roomName: item.roomName,
      currentVersion: {
        clipVersionId: item.currentVersion.clipVersionId ?? null,
        versionStatus: item.currentVersion.versionStatus ?? null,
        aiDirections: item.currentVersion.aiDirections ?? null,
        videoUrl: item.currentVersion.videoUrl ?? null,
        thumbnail: item.currentVersion.thumbnail ?? null,
        generatedAt: item.currentVersion.generatedAt ?? null
      },
      inFlightVersion: {
        clipVersionId: item.inFlightVersion?.clipVersionId ?? null,
        versionStatus: item.inFlightVersion?.versionStatus ?? null,
        aiDirections: item.inFlightVersion?.aiDirections ?? null,
        videoUrl: item.inFlightVersion?.videoUrl ?? null,
        thumbnail: item.inFlightVersion?.thumbnail ?? null,
        generatedAt: item.inFlightVersion?.generatedAt ?? null
      },
      versions: item.versions.map((version) => ({
        clipVersionId: version.clipVersionId ?? null,
        versionNumber: version.versionNumber ?? null,
        videoUrl: version.videoUrl ?? null,
        thumbnail: version.thumbnail ?? null,
        generatedAt: version.generatedAt ?? null
      }))
    }))
  );
}

export function useIsDesktopLayout() {
  const [isDesktop, setIsDesktop] = React.useState(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return true;
    }
    return window.matchMedia("(min-width: 1024px)").matches;
  });

  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches);
    };

    setIsDesktop(mediaQuery.matches);
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isDesktop;
}
