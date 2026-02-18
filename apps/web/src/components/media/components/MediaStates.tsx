import { ArrowRight } from "lucide-react";
import { mediaLibraryHelpLink } from "@web/src/components/media/shared";

export const MediaHelpCard = () => {
  return (
    <div className="rounded-lg bg-secondary border border-border px-4 py-3 max-w-3xl">
      <h2 className="text-xl font-header font-medium text-foreground">
        How to use the media library
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Upload interesting b-roll footage of your daily work that can be reused
        as background content across different social media posts.
      </p>
      <a
        className="mt-3 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        href={mediaLibraryHelpLink.href}
        target="_blank"
        rel="noreferrer"
      >
        {mediaLibraryHelpLink.label}
        <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
};

export const MediaFilterEmptyState = () => {
  return (
    <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
      No media matches this filter yet.
    </div>
  );
};

export const MediaEmptyState = () => {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <div className="relative mb-6 h-24 w-56">
        <div className="absolute left-6 top-0 h-24 w-40 rotate-[-8deg] z-10 rounded-lg border border-border bg-linear-to-br from-secondary to-secondary/50 shadow-md" />
        <div className="absolute left-14 top-2 h-24 w-40 rotate-[4deg] rounded-lg border border-border bg-linear-to-br from-secondary to-secondary/50 shadow-md" />
        <div className="absolute left-20 top-1 h-24 w-40 -rotate-2 rounded-lg border border-border bg-linear-to-br from-secondary to-secondary/50 shadow-lg" />
      </div>
      <p className="text-sm font-semibold text-foreground">
        You haven&apos;t added any media yet
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        Click &quot;Upload media&quot; to get started.
      </p>
    </div>
  );
};
