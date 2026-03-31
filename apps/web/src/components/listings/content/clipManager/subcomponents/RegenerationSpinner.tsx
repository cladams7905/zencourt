"use client";

import { Loader2 } from "lucide-react";

export function RegenerationSpinner({ label }: { label: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-flex items-center justify-center text-white/85"
    >
      <Loader2 className="h-4 w-4 animate-spin" />
    </span>
  );
}
