"use client";

import * as React from "react";
import { ViewHeader } from "../dashboard/ViewHeader";
import { Progress } from "../ui/progress";
import { categorizeListingImages } from "@web/src/server/actions/api/vision";
import { getListingImages } from "@web/src/server/actions/db/listings";

type ListingImageItem = {
  id: string;
  url: string;
  filename: string;
  category: string | null;
};

interface ListingDetailViewProps {
  title: string;
  listingId: string;
  userId: string;
  initialImages: ListingImageItem[];
}

const timelineSteps = [
  { label: "Upload", active: true },
  { label: "Review", active: false },
  { label: "Create", active: false }
];

const formatCategoryLabel = (category: string) => {
  if (category === "needs-categorization") {
    return "Needs categorization";
  }
  return category
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export function ListingDetailView({
  title,
  listingId,
  userId,
  initialImages
}: ListingDetailViewProps) {
  const [images, setImages] = React.useState<ListingImageItem[]>(initialImages);
  const [isCategorizing, setIsCategorizing] = React.useState(false);
  const [progressValue, setProgressValue] = React.useState(0);
  const hasStartedRef = React.useRef(false);

  const totalImages = images.length;
  const categorizedCount = images.filter((image) => image.category).length;
  const computedProgress = totalImages
    ? Math.round((categorizedCount / totalImages) * 100)
    : 0;

  React.useEffect(() => {
    if (!isCategorizing) {
      return;
    }
    setProgressValue((prev) =>
      Math.max(prev, Math.min(100, computedProgress))
    );
  }, [computedProgress, isCategorizing]);

  React.useEffect(() => {
    const needsCategorization = images.some((image) => !image.category);
    if (!needsCategorization || hasStartedRef.current) {
      return;
    }

    hasStartedRef.current = true;
    setIsCategorizing(true);
    setProgressValue(0);

    categorizeListingImages(userId, listingId)
      .catch(() => null)
      .finally(async () => {
        try {
          const updated = await getListingImages(userId, listingId);
          setImages(
            updated.map((image) => ({
              id: image.id,
              url: image.url,
              filename: image.filename,
              category: image.category ?? null
            }))
          );
        } catch {
          // Keep existing images if refresh fails.
        }
        setProgressValue(100);
        setIsCategorizing(false);
      });
  }, [images, listingId, userId]);

  React.useEffect(() => {
    if (!isCategorizing) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await getListingImages(userId, listingId);
        setImages(
          updated.map((image) => ({
            id: image.id,
            url: image.url,
            filename: image.filename,
            category: image.category ?? null
          }))
        );
      } catch {
        // Ignore polling errors to avoid disrupting the UI.
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isCategorizing, listingId, userId]);

  const categorizedImages = images.reduce<Record<string, ListingImageItem[]>>(
    (acc, image) => {
      const key = image.category ?? "needs-categorization";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(image);
      return acc;
    },
    {}
  );

  const categoryOrder = Object.keys(categorizedImages).sort((a, b) => {
    if (a === "needs-categorization") return 1;
    if (b === "needs-categorization") return -1;
    return a.localeCompare(b);
  });

  return (
    <>
      <ViewHeader title={title} />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-8 py-10">
        <div className="mx-auto w-full max-w-[360px]">
          <div className="relative flex items-center justify-between">
            <div className="absolute left-0 top-[5px] h-px w-full bg-border -z-10" />
            {timelineSteps.map((step) => (
              <div
                key={step.label}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className={`h-2.5 w-2.5 rotate-45 ring-4 ring-background shadow-sm ${
                    step.active
                      ? "bg-foreground"
                      : "bg-background border border-border"
                  }`}
                />
                <span
                  className={`mt-1.5 text-[11px] uppercase tracking-widest ${
                    step.active
                      ? "font-semibold text-foreground"
                      : "font-medium text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {isCategorizing && (
          <section className="space-y-2 rounded-xl border border-border/60 bg-secondary px-4 py-3">
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Categorizing rooms with AI</span>
              <span>{progressValue}%</span>
            </div>
            <Progress value={progressValue} />
          </section>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-header font-semibold text-foreground">
              Listing photos
            </h2>
            <span className="text-xs text-muted-foreground">
              {images.length} photo{images.length === 1 ? "" : "s"}
            </span>
          </div>

          {images.length === 0 ? (
            <div className="rounded-lg border border-border/60 bg-secondary p-6 text-sm text-muted-foreground">
              No images uploaded yet.
            </div>
          ) : (
            <div className="space-y-8">
              {categoryOrder.map((category) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground">
                      {formatCategoryLabel(category)}
                    </h3>
                    <span className="text-xs text-muted-foreground">
                      {categorizedImages[category].length} photo
                      {categorizedImages[category].length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                    {categorizedImages[category].map((image) => (
                      <div
                        key={image.id}
                        className="relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-secondary/40"
                      >
                        <img
                          src={image.url}
                          alt={image.filename}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
