"use client";

import { useEffect } from "react";
import { markCurrentUserProfileCompleted } from "@web/src/server/actions/user/commands";

export function MarkProfileCompleted({ userId }: { userId: string }) {
  useEffect(() => {
    void markCurrentUserProfileCompleted();
  }, [userId]);
  return null;
}
