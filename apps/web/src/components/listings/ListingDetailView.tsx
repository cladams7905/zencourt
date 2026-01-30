"use client";

import * as React from "react";
import { ListingViewHeader } from "./ListingViewHeader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "../ui/accordion";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "../ui/dropdown-menu";
import {
  AlertTriangle,
  MoreHorizontal,
  Move,
  Pencil,
  Plus,
  Star,
  Trash2,
  Upload
} from "lucide-react";
import { LoadingImage } from "../ui/loading-image";
import { UploadDialog } from "../uploads/UploadDialog";
import { MAX_IMAGE_BYTES } from "@shared/utils/mediaUpload";
import { toast } from "sonner";
import {
  createListingImageRecords,
  getListingImageUploadUrls,
  updateListingImageAssignments
} from "@web/src/server/actions/db/listings";
import { ROOM_CATEGORIES, type RoomCategory } from "@web/src/types/vision";
import { useRouter } from "next/navigation";
import { ListingCategoryDialog } from "./ListingCategoryDialog";
import { ListingCategoryDeleteDialog } from "./ListingCategoryDeleteDialog";
import { ListingImageMoveDialog } from "./ListingImageMoveDialog";
import { ListingImageDeleteDialog } from "./ListingImageDeleteDialog";
import { getImageMetadataFromFile } from "@web/src/lib/imageMetadata";

type ListingImageItem = {
  id: string;
  url: string;
  filename: string;
  category: string | null;
  isPrimary?: boolean | null;
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

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

const normalizeCategory = (value: string) => value.trim().toLowerCase();
const MULTI_ROOM_CATEGORIES = new Set(
  Object.values(ROOM_CATEGORIES)
    .filter((category) => category.allowNumbering)
    .map((category) => category.id)
);

const getCategoryBase = (category: string) => category.replace(/-\d+$/, "");

const formatCategoryLabel = (
  category: string,
  baseCounts: Record<string, number>
) => {
  if (category === "needs-categorization") {
    return "Needs categorization";
  }
  const baseCategory = getCategoryBase(category);
  const metadata = ROOM_CATEGORIES[baseCategory as RoomCategory];
  const baseLabel =
    metadata?.label ??
    baseCategory
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  const match = category.match(/-(\d+)$/);
  const roomNumber = match ? Number(match[1]) : 1;
  const shouldNumber =
    metadata?.allowNumbering && (baseCounts[baseCategory] ?? 0) > 1;

  if (shouldNumber) {
    return `${baseLabel} ${roomNumber}`;
  }

  return baseLabel;
};

const getNextCategoryValue = (base: string, existing: string[]) => {
  const normalizedBase = normalizeCategory(base);
  let maxIndex = 0;

  existing.forEach((category) => {
    const normalized = normalizeCategory(category);
    if (normalized === normalizedBase) {
      maxIndex = Math.max(maxIndex, 1);
      return;
    }
    if (normalized.startsWith(`${normalizedBase}-`)) {
      const suffix = normalized.slice(normalizedBase.length + 1);
      const numberValue = Number(suffix);
      if (Number.isInteger(numberValue) && numberValue > 0) {
        maxIndex = Math.max(maxIndex, numberValue);
      }
    }
  });

  if (maxIndex === 0) {
    return normalizedBase;
  }

  return `${normalizedBase}-${maxIndex + 1}`;
};

export function ListingDetailView({
  title,
  listingId,
  userId,
  initialImages
}: ListingDetailViewProps) {
  const router = useRouter();
  const [images, setImages] = React.useState<ListingImageItem[]>(initialImages);
  const [dragOverCategory, setDragOverCategory] = React.useState<string | null>(
    null
  );
  const [addressValue, setAddressValue] = React.useState("");
  const [priceValue, setPriceValue] = React.useState("");
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = React.useState(false);
  const [categoryDialogMode, setCategoryDialogMode] = React.useState<
    "create" | "edit"
  >("create");
  const [categoryDialogCategory, setCategoryDialogCategory] = React.useState<
    string | null
  >(null);
  const [deleteCategory, setDeleteCategory] = React.useState<string | null>(
    null
  );
  const [moveImageId, setMoveImageId] = React.useState<string | null>(null);
  const [deleteImageId, setDeleteImageId] = React.useState<string | null>(null);
  const [openImageMenuId, setOpenImageMenuId] = React.useState<string | null>(
    null
  );
  const [customCategories, setCustomCategories] = React.useState<string[]>([]);
  const initialImagesRef = React.useRef(initialImages);

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

  const categoryOrder = React.useMemo(() => {
    const keys = new Set([
      ...Object.keys(categorizedImages),
      ...customCategories
    ]);
    const sorted = Array.from(keys).sort((a, b) => {
      if (a === "needs-categorization") return -1;
      if (b === "needs-categorization") return 1;
      return a.localeCompare(b);
    });
    return sorted;
  }, [categorizedImages, customCategories]);
  const baseCategoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    categoryOrder.forEach((category) => {
      if (category === "needs-categorization") {
        return;
      }
      const base = getCategoryBase(category);
      counts[base] = (counts[base] ?? 0) + 1;
    });
    return counts;
  }, [categoryOrder]);
  const hasUncategorized = images.some((image) => !image.category);
  const hasEmptyCategory = categoryOrder.some(
    (category) => (categorizedImages[category]?.length ?? 0) === 0
  );
  const needsAddress = addressValue.trim() === "";
  const canContinue = !hasUncategorized && !hasEmptyCategory && !needsAddress;
  const existingFileNames = React.useMemo(() => {
    return new Set(images.map((image) => image.filename.toLowerCase()));
  }, [images]);
  const moveCategoryOptions = React.useMemo(() => {
    return categoryOrder.map((category) => ({
      value: category,
      label:
        category === "needs-categorization"
          ? "Uncategorized"
          : formatCategoryLabel(category, baseCategoryCounts)
    }));
  }, [baseCategoryCounts, categoryOrder]);
  const activeMoveImage = React.useMemo(
    () => images.find((image) => image.id === moveImageId) ?? null,
    [images, moveImageId]
  );
  const activeDeleteImage = React.useMemo(
    () => images.find((image) => image.id === deleteImageId) ?? null,
    [images, deleteImageId]
  );

  const resolveCategoryValue = (
    input: string,
    mode: "create" | "edit",
    originalCategory?: string | null
  ) => {
    const nextCategory = input.trim();
    if (!nextCategory) {
      return null;
    }
    const normalizedNext = normalizeCategory(nextCategory);
    if (normalizedNext === "other") {
      toast.error("Please choose a specific room category.");
      return null;
    }
    if (mode === "edit" && originalCategory) {
      if (normalizeCategory(originalCategory) === normalizedNext) {
        return originalCategory;
      }
    }
    const existingCategories = categoryOrder.filter(
      (category) => category !== originalCategory
    );
    const existingNormalized = new Set(
      existingCategories.map((category) => normalizeCategory(category))
    );
    const isMultiRoom = MULTI_ROOM_CATEGORIES.has(
      normalizedNext as RoomCategory
    );
    if (!isMultiRoom && existingNormalized.has(normalizedNext)) {
      toast.error("That room already exists.");
      return null;
    }
    if (isMultiRoom) {
      return getNextCategoryValue(normalizedNext, existingCategories);
    }
    return nextCategory;
  };

  const handleCreateCategory = (value: string) => {
    const createdCategory = resolveCategoryValue(value, "create");
    if (!createdCategory) {
      return;
    }
    setCustomCategories((prev) => {
      if (prev.includes(createdCategory)) {
        return prev;
      }
      return [...prev, createdCategory];
    });
    setIsCategoryDialogOpen(false);
  };

  const handleEditCategory = (value: string) => {
    if (!categoryDialogCategory) {
      return;
    }
    const updatedCategory = resolveCategoryValue(
      value,
      "edit",
      categoryDialogCategory
    );
    if (!updatedCategory) {
      return;
    }
    const originalCategory = categoryDialogCategory;
    if (updatedCategory === originalCategory) {
      setIsCategoryDialogOpen(false);
      return;
    }
    setImages((prev) =>
      prev.map((image) =>
        image.category === originalCategory
          ? { ...image, category: updatedCategory }
          : image
      )
    );
    setCustomCategories((prev) => {
      const updated = prev.filter((category) => category !== originalCategory);
      if (
        ROOM_CATEGORIES[updatedCategory as RoomCategory] ||
        updated.includes(updatedCategory)
      ) {
        return updated;
      }
      return [...updated, updatedCategory];
    });
    setIsCategoryDialogOpen(false);
  };

  const handleDeleteCategory = () => {
    if (!deleteCategory) {
      return;
    }
    const categoryToDelete = deleteCategory;
    setImages((prev) =>
      prev.map((image) =>
        image.category === categoryToDelete
          ? { ...image, category: null, isPrimary: false }
          : image
      )
    );
    setCustomCategories((prev) =>
      prev.filter((category) => category !== categoryToDelete)
    );
    setDeleteCategory(null);
  };

  const handleMoveImage = (targetCategory: string) => {
    if (!moveImageId) {
      return;
    }
    const resolvedCategory =
      targetCategory === "needs-categorization" ? null : targetCategory;
    setImages((prev) =>
      prev.map((image) =>
        image.id === moveImageId
          ? {
              ...image,
              category: resolvedCategory,
              isPrimary:
                image.category === resolvedCategory ? image.isPrimary : false
            }
          : image
      )
    );
    setMoveImageId(null);
  };

  const handleSetPrimaryImage = (imageId: string) => {
    const selected = images.find((image) => image.id === imageId);
    if (!selected || !selected.category) {
      toast.error("Assign a category before setting a primary image.");
      return;
    }
    setImages((prev) =>
      prev.map((image) => {
        if (image.category !== selected.category) {
          return image;
        }
        return {
          ...image,
          isPrimary: image.id === imageId
        };
      })
    );
  };

  const handleDeleteImage = () => {
    if (!deleteImageId) {
      return;
    }
    const imageId = deleteImageId;
    setImages((prev) => prev.filter((image) => image.id !== imageId));
    setDeleteImageId(null);
  };

  const handleContinue = async () => {
    const initialMap = new Map(
      initialImagesRef.current.map((image) => [
        image.id,
        image.category ?? null
      ])
    );
    const initialPrimaryMap = new Map(
      initialImagesRef.current.map((image) => [
        image.id,
        image.isPrimary ?? false
      ])
    );
    const currentIds = new Set(images.map((image) => image.id));
    const deletions = Array.from(initialMap.keys()).filter(
      (id) => !currentIds.has(id)
    );
    const updates = images
      .filter((image) => initialMap.has(image.id))
      .filter((image) => {
        const originalCategory = initialMap.get(image.id) ?? null;
        const originalPrimary = initialPrimaryMap.get(image.id) ?? false;
        return (
          (image.category ?? null) !== originalCategory ||
          (image.isPrimary ?? false) !== originalPrimary
        );
      })
      .map((image) => ({
        id: image.id,
        category: image.category ?? null,
        isPrimary: image.isPrimary ?? false
      }));

    if (updates.length === 0 && deletions.length === 0) {
      toast.message("No changes to save.");
      return;
    }

    try {
      await updateListingImageAssignments(
        userId,
        listingId,
        updates,
        deletions
      );
      initialImagesRef.current = images;
      toast.success("Listing updates saved.");
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to save listing updates."
      );
    }
  };

  const handleDragStart =
    (imageId: string) => (event: React.DragEvent<HTMLDivElement>) => {
      event.dataTransfer.setData("text/plain", imageId);
      event.dataTransfer.effectAllowed = "move";
    };

  const handleDrop =
    (category: string) => (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const imageId = event.dataTransfer.getData("text/plain");
      if (!imageId) {
        return;
      }
      const nextCategory =
        category === "needs-categorization" ? null : category;
      setImages((prev) =>
        prev.map((image) =>
          image.id === imageId
            ? {
                ...image,
                category: nextCategory,
                isPrimary:
                  image.category === nextCategory ? image.isPrimary : false
              }
            : image
        )
      );
      setDragOverCategory(null);
    };

  return (
    <>
      <ListingViewHeader
        title={title}
        action={<Button variant="outline">Save as draft</Button>}
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-10">
        <div className="mx-auto w-full max-w-[360px]">
          <div className="relative flex items-center justify-between mb-6">
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

        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="flex-1">
            <div className="flex w-full gap-8">
              <div className="flex flex- w-full items-center gap-3">
                <h2 className="text-xl font-header text-foreground">
                  Listing photos
                </h2>
                <div className="ml-auto flex items-center gap-2 flex-nowrap">
                  <span className="text-xs text-muted-foreground mr-[9px] font-medium">
                    {images.length}/20 photos
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => setIsUploadOpen(true)}
                      >
                        <Upload className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      Upload more listing photos
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8"
                        onClick={() => {
                          setCategoryDialogMode("create");
                          setCategoryDialogCategory(null);
                          setIsCategoryDialogOpen(true);
                        }}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent sideOffset={6}>
                      Add a custom room category
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
            {images.length === 0 ? (
              <div className="mt-6 rounded-lg border border-border/60 bg-secondary p-6 text-sm text-muted-foreground">
                No images uploaded yet.
              </div>
            ) : (
              <Accordion
                type="multiple"
                defaultValue={categoryOrder}
                className="mt-6 space-y-4"
              >
                {categoryOrder.map((category) => (
                  <AccordionItem
                    key={category}
                    value={category}
                    className={`rounded-xl border px-4 ${
                      category === "needs-categorization"
                        ? "border-destructive/40 bg-destructive/10 text-destructive"
                        : "border-border/60 bg-card"
                    }`}
                  >
                    <AccordionTrigger
                      className={`py-4 ${
                        category === "needs-categorization"
                          ? "text-destructive"
                          : ""
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-4">
                        <div
                          className={`flex items-center gap-2 text-sm ${
                            category === "needs-categorization"
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                        >
                          {formatCategoryLabel(category, baseCategoryCounts)}
                        </div>
                        <div className="flex items-center gap-4">
                          {(() => {
                            const count =
                              categorizedImages[category]?.length ?? 0;
                            return (
                              <span
                                className={`text-xs ${
                                  category === "needs-categorization"
                                    ? "text-destructive/80"
                                    : "text-muted-foreground"
                                }`}
                              >
                                {count} photo{count === 1 ? "" : "s"}
                              </span>
                            );
                          })()}
                          {category !== "needs-categorization" ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="flex items-center justify-center rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                                  aria-label="Category settings"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" sideOffset={8}>
                                <DropdownMenuItem
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    setCategoryDialogMode("edit");
                                    setCategoryDialogCategory(category);
                                    setIsCategoryDialogOpen(true);
                                  }}
                                >
                                  <Pencil size={12} />
                                  Rename category
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="my-1.5 bg-border/50" />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onSelect={(event) => {
                                    event.preventDefault();
                                    setDeleteCategory(category);
                                  }}
                                >
                                  <Trash2 size={12} />
                                  Delete category
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : (
                            <div className="h-6 w-6" />
                          )}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div
                        className={`rounded-xl border border-dashed px-3 py-3 transition-colors ${
                          category === "needs-categorization"
                            ? dragOverCategory === category
                              ? "border-destructive/60 bg-destructive/10"
                              : "border-destructive/30"
                            : dragOverCategory === category
                              ? "border-foreground/40 bg-secondary"
                              : "border-border/60"
                        }`}
                        onDragOver={(event) => {
                          event.preventDefault();
                          setDragOverCategory(category);
                        }}
                        onDragLeave={() => setDragOverCategory(null)}
                        onDrop={handleDrop(category)}
                      >
                        {categorizedImages[category]?.length ? (
                          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                            {[...categorizedImages[category]]
                              .sort((a, b) => {
                                const primaryA = a.isPrimary ? 1 : 0;
                                const primaryB = b.isPrimary ? 1 : 0;
                                return primaryB - primaryA;
                              })
                              .map((image) => (
                              <div
                                key={image.id}
                                className="group relative aspect-square overflow-hidden rounded-xl border border-border/60 bg-secondary/40 cursor-grab"
                                draggable
                                onDragStart={handleDragStart(image.id)}
                              >
                                {image.isPrimary ? (
                                  <div className="absolute top-2 left-2 z-10 rounded-full bg-foreground/90 px-2 py-0.5 text-[10px] font-medium text-background">
                                    Primary
                                  </div>
                                ) : null}
                                <div
                                  className={`absolute top-2 right-2 z-10 transition-opacity ${
                                    openImageMenuId === image.id
                                      ? "opacity-100"
                                      : "opacity-0 group-hover:opacity-100"
                                  }`}
                                >
                                  <DropdownMenu
                                    open={openImageMenuId === image.id}
                                    onOpenChange={(open) =>
                                      setOpenImageMenuId(open ? image.id : null)
                                    }
                                  >
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 rounded-full bg-background/70 backdrop-blur-sm hover:bg-background"
                                        aria-label="Photo options"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                      align="end"
                                      sideOffset={8}
                                    >
                                      <DropdownMenuItem
                                        disabled={
                                          !image.category ||
                                          image.isPrimary ||
                                          undefined
                                        }
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          handleSetPrimaryImage(image.id);
                                        }}
                                      >
                                        <Star size={12} />
                                        {image.isPrimary
                                          ? "Primary image"
                                          : "Set as primary"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          setMoveImageId(image.id);
                                        }}
                                      >
                                        <Move size={12} />
                                        Move to category
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="my-1.5 bg-border/50" />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onSelect={(event) => {
                                          event.preventDefault();
                                          setDeleteImageId(image.id);
                                        }}
                                      >
                                        <Trash2 size={12} />
                                        Delete photo
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <LoadingImage
                                  src={image.url}
                                  alt={image.filename}
                                  className="h-full w-full object-cover"
                                  fill
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                            Drag photos here to add to this category.
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </section>

          <aside className="w-full lg:w-72 mt-14">
            <div className="sticky top-[124px] space-y-4">
              <div className="rounded-xl border border-border/60 bg-secondary px-4 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg text-foreground">Listing details</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add essentials now so we can tailor the campaign.
                </p>
                <div className="mt-4 space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm text-foreground">
                      Listing address
                    </label>
                    <Input
                      placeholder="123 Market Street, Seattle WA"
                      value={addressValue}
                      onChange={(event) => setAddressValue(event.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm text-foreground">
                      Listing price
                    </label>
                    <Input
                      placeholder="$850,000"
                      value={priceValue}
                      onChange={(event) => setPriceValue(event.target.value)}
                    />
                  </div>
                </div>
                <div className="my-4 h-px w-full bg-border/60" />
                <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                  <p className="text-[11px] font-semibold uppercase tracking-wide">
                    Required fixes
                  </p>
                  <ul className="mt-2 space-y-2 text-destructive">
                    {hasUncategorized ? (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                        <span>No images in the uncategorized section.</span>
                      </li>
                    ) : null}
                    {hasEmptyCategory ? (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                        <span>No empty room categories.</span>
                      </li>
                    ) : null}
                    {needsAddress ? (
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                        <span>Listing address is filled in.</span>
                      </li>
                    ) : null}
                    {!hasUncategorized && !hasEmptyCategory && !needsAddress ? (
                      <li className="text-muted-foreground">All set.</li>
                    ) : null}
                  </ul>
                </div>
                <Button
                  className="mt-4 w-full"
                  disabled={!canContinue}
                  onClick={handleContinue}
                >
                  Continue
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        title="Upload listing photos"
        description={`Add images up to ${formatBytes(MAX_IMAGE_BYTES)}.`}
        accept="image/*"
        dropTitle="Drag & drop photos here"
        dropSubtitle="or click to select multiple images"
        primaryActionLabel="Upload photos"
        selectedLabel="photo"
        errorMessage="Failed to upload photos. Please try again."
        tipsTitle="What photos should I upload?"
        tipsItems={[
          "No more than 20 listing photos may be uploaded per listing.",
          "Select at least 2 listing photos per room for best output quality.",
          "Include a wide variety well-framed shots of key rooms and exterior."
        ]}
        fileMetaLabel={(file) => formatBytes(file.size)}
        fileValidator={(file) => {
          if (!file.type.startsWith("image/")) {
            return {
              accepted: false,
              error: "Only image files are supported."
            };
          }
          if (file.size > MAX_IMAGE_BYTES) {
            return {
              accepted: false,
              error: `"${file.name}" exceeds the image size limit.`
            };
          }
          if (existingFileNames.has(file.name.toLowerCase())) {
            return {
              accepted: false,
              error: `"${file.name}" is already in this listing.`
            };
          }
          return { accepted: true };
        }}
        getUploadUrls={(requests) =>
          getListingImageUploadUrls(userId, listingId, requests)
        }
        buildRecordInput={async ({ upload, file }) => {
          if (!upload.fileName || !upload.publicUrl) {
            throw new Error("Listing upload is missing metadata.");
          }
          const metadata = await getImageMetadataFromFile(file);
          return {
            key: upload.key,
            fileName: upload.fileName,
            publicUrl: upload.publicUrl,
            metadata
          };
        }}
        onCreateRecords={async (records) => {
          const batchStartedAt = Date.now();
          const created = await createListingImageRecords(
            userId,
            listingId,
            records
          );
          const createdItems = created.map((image) => ({
            id: image.id,
            url: image.url,
            filename: image.filename,
            category: image.category ?? null,
            isPrimary: image.isPrimary ?? false
          }));
          setImages((prev) => [...createdItems, ...prev]);
          router.push(
            `/listings/${listingId}/processing?batch=${created.length}&batchStartedAt=${batchStartedAt}`
          );
        }}
      />
      <ListingCategoryDialog
        open={isCategoryDialogOpen}
        mode={categoryDialogMode}
        initialCategory={categoryDialogCategory ?? undefined}
        onOpenChange={setIsCategoryDialogOpen}
        onSubmit={
          categoryDialogMode === "edit"
            ? handleEditCategory
            : handleCreateCategory
        }
      />
      <ListingCategoryDeleteDialog
        open={Boolean(deleteCategory)}
        categoryLabel={formatCategoryLabel(
          deleteCategory ?? "",
          baseCategoryCounts
        )}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCategory(null);
          }
        }}
        onConfirm={handleDeleteCategory}
      />
      <ListingImageMoveDialog
        open={Boolean(moveImageId)}
        imageName={activeMoveImage?.filename ?? null}
        options={moveCategoryOptions}
        currentValue={
          activeMoveImage?.category
            ? activeMoveImage.category
            : "needs-categorization"
        }
        onOpenChange={(open) => {
          if (!open) {
            setMoveImageId(null);
          }
        }}
        onSubmit={handleMoveImage}
      />
      <ListingImageDeleteDialog
        open={Boolean(deleteImageId)}
        imageName={activeDeleteImage?.filename ?? null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteImageId(null);
          }
        }}
        onConfirm={handleDeleteImage}
      />
    </>
  );
}
