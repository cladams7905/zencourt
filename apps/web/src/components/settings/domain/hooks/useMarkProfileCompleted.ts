"use client";

import { useEffect } from "react";
import { markCurrentUserProfileCompleted } from "@web/src/server/actions/user/commands";

/**
 * When `enabled`, marks the current user's profile as completed on mount and when `userId` changes.
 */
export function useMarkProfileCompleted(enabled: boolean, userId: string) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    void markCurrentUserProfileCompleted();
  }, [enabled, userId]);
}
