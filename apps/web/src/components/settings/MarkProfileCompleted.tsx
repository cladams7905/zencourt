"use client";

import { useEffect } from "react";
import { markProfileCompleted } from "@web/src/server/actions/db/userAdditional";

export function MarkProfileCompleted({ userId }: { userId: string }) {
  useEffect(() => {
    void markProfileCompleted(userId);
  }, [userId]);
  return null;
}
