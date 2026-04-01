import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { AddressAutocomplete } from "@web/src/components/location";
import {
  MAX_CATEGORIES,
  MAX_IMAGES_PER_ROOM
} from "@shared/utils/mediaUpload";

type ListingDetailsPanelProps = {
  addressValue: string;
  setAddressValue: React.Dispatch<React.SetStateAction<string>>;
  googleMapsApiKey: string;
  hasUncategorized: boolean;
  hasEmptyCategory: boolean;
  needsAddress: boolean;
  hasOverLimit: boolean;
  hasOverUsedLimit?: boolean;
  usedImageCount?: number;
  maxUsedImagesTotal?: number;
  uncategorizedDockCount?: number;
  hasTooManyCategories: boolean;
  handleAddressSelect: (selection: { formattedAddress?: string | null }) => void;
};

export function ListingDetailsPanel({
  addressValue,
  setAddressValue,
  googleMapsApiKey,
  hasUncategorized,
  hasEmptyCategory,
  needsAddress,
  hasOverLimit,
  hasOverUsedLimit = false,
  usedImageCount = 0,
  maxUsedImagesTotal = 12,
  uncategorizedDockCount = 0,
  hasTooManyCategories,
  handleAddressSelect
}: ListingDetailsPanelProps) {
  return (
    <aside className="w-full lg:w-72 mt-14">
      <div className="sticky top-[124px] space-y-4">
        <div className="rounded-lg border border-border bg-secondary px-4 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg text-foreground">Listing details</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Add the listing address now so we can begin tailoring the campaign.
          </p>
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <label className="text-sm text-foreground">Listing address</label>
              <AddressAutocomplete
                placeholder="123 Market Street, Seattle WA"
                value={addressValue}
                onChange={setAddressValue}
                onSelectAddress={handleAddressSelect}
                apiKey={googleMapsApiKey}
              />
            </div>
          </div>
          <div className="gap-4 space-y-4">
            {hasUncategorized ||
            hasEmptyCategory ||
            needsAddress ||
            hasOverLimit ||
            hasOverUsedLimit ||
            hasTooManyCategories ? (
              <div className="mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                <p className="text-[11px] font-semibold uppercase tracking-wide">
                  Required fixes
                </p>
                <ul className="mt-2 space-y-2 text-destructive">
                  {hasUncategorized ? (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                      <span>
                        {uncategorizedDockCount > 0
                          ? `${uncategorizedDockCount} photo${
                              uncategorizedDockCount === 1 ? "" : "s"
                            } still need a room category.`
                          : "One or more images are uncategorized."}
                      </span>
                    </li>
                  ) : null}
                  {hasEmptyCategory ? (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                      <span>One or more room categories are empty.</span>
                    </li>
                  ) : null}
                  {hasTooManyCategories ? (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                      <span>Limit categories to {MAX_CATEGORIES} per listing.</span>
                    </li>
                  ) : null}
                  {hasOverLimit ? (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                      <span>
                        One or more room categories have more than{" "}
                        {MAX_IMAGES_PER_ROOM} used photos.
                      </span>
                    </li>
                  ) : null}
                  {hasOverUsedLimit ? (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                      <span>
                        Reduce the used photo selection to {maxUsedImagesTotal} or
                        fewer. Currently selected: {usedImageCount}.
                      </span>
                    </li>
                  ) : null}
                  {needsAddress ? (
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5" />
                      <span>Listing address is not filled in.</span>
                    </li>
                  ) : null}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </aside>
  );
}
