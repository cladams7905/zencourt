import * as React from "react";
import { toast } from "sonner";
import { updateUserLocation } from "@web/src/server/actions/db/userAdditional";
import {
  formatLocationForStorage,
  normalizeCountyName
} from "@web/src/lib/locationHelpers";
import type { LocationData } from "@web/src/components/location";

interface UseAccountLocationSettingsArgs {
  userId: string;
  location: string | null;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterSave?: (save: () => Promise<void>) => void;
}

export const useAccountLocationSettings = ({
  userId,
  location,
  onDirtyChange,
  onRegisterSave
}: UseAccountLocationSettingsArgs) => {
  const [locationValue, setLocationValue] = React.useState<LocationData | null>(
    null
  );
  const [isSavingLocation, setIsSavingLocation] = React.useState(false);
  const [savedLocation, setSavedLocation] = React.useState(location ?? "");
  const [isEditingLocationDetails, setIsEditingLocationDetails] =
    React.useState(false);
  const [countyOverride, setCountyOverride] = React.useState("");
  const [serviceAreasOverride, setServiceAreasOverride] = React.useState("");
  const [locationHasErrors, setLocationHasErrors] = React.useState(false);

  const suggestedCounty = locationValue?.county ?? "";
  const suggestedServiceAreas = React.useMemo(
    () => locationValue?.serviceAreas ?? [],
    [locationValue?.serviceAreas]
  );
  const suggestedServiceAreasText = suggestedServiceAreas.join(", ");

  React.useEffect(() => {
    if (!locationValue) {
      setCountyOverride("");
      setServiceAreasOverride("");
      setIsEditingLocationDetails(false);
      return;
    }
    setCountyOverride(suggestedCounty);
    setServiceAreasOverride(suggestedServiceAreasText);
  }, [locationValue, suggestedCounty, suggestedServiceAreasText]);

  const locationDraft = React.useMemo(() => {
    return locationValue ? formatLocationForStorage(locationValue) : "";
  }, [locationValue]);

  const isLocationDirty = React.useMemo(() => {
    if (!locationValue) {
      return false;
    }
    const overridesDirty =
      countyOverride.trim() !== suggestedCounty.trim() ||
      serviceAreasOverride.trim() !== suggestedServiceAreasText.trim();
    return locationDraft !== savedLocation || overridesDirty;
  }, [
    countyOverride,
    locationDraft,
    locationValue,
    savedLocation,
    serviceAreasOverride,
    suggestedCounty,
    suggestedServiceAreasText
  ]);

  React.useEffect(() => {
    if (locationValue) {
      return;
    }
    setSavedLocation(location ?? "");
  }, [location, locationValue]);

  const handleSaveLocation = React.useCallback(async () => {
    if (!locationValue) {
      return;
    }
    const formattedLocation = formatLocationForStorage(locationValue);
    setIsSavingLocation(true);
    try {
      const resolvedCounty = normalizeCountyName(
        countyOverride.trim() || suggestedCounty
      );
      const resolvedServiceAreas = serviceAreasOverride
        .split(",")
        .map((area) => area.trim())
        .filter(Boolean);

      await updateUserLocation(userId, formattedLocation, {
        county: resolvedCounty || null,
        serviceAreas:
          resolvedServiceAreas.length > 0
            ? resolvedServiceAreas
            : suggestedServiceAreas
      });
      setSavedLocation(formattedLocation);
      toast.success("Location updated.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to update location.");
    } finally {
      setIsSavingLocation(false);
    }
  }, [
    countyOverride,
    locationValue,
    serviceAreasOverride,
    suggestedCounty,
    suggestedServiceAreas,
    userId
  ]);

  React.useEffect(() => {
    onDirtyChange?.(isLocationDirty);
  }, [isLocationDirty, onDirtyChange]);

  React.useEffect(() => {
    onRegisterSave?.(handleSaveLocation);
  }, [handleSaveLocation, onRegisterSave]);

  return {
    locationValue,
    setLocationValue,
    isSavingLocation,
    savedLocation,
    isEditingLocationDetails,
    setIsEditingLocationDetails,
    countyOverride,
    setCountyOverride,
    serviceAreasOverride,
    setServiceAreasOverride,
    locationHasErrors,
    setLocationHasErrors,
    suggestedCounty,
    suggestedServiceAreas,
    suggestedServiceAreasText,
    isLocationDirty,
    handleSaveLocation
  };
};
