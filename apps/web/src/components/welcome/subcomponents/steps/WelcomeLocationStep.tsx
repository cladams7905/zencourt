import type { LocationData } from "../../../location";
import { LocationAutocomplete } from "../../../location";
import { LocationDetailsPanel } from "../../../location";
import { Label } from "../../../ui/label";

type WelcomeLocationStepProps = {
  googleMapsApiKey: string;
  currentStep: number;
  location: LocationData | null;
  onLocationChange: (value: LocationData | null) => void;
  suggestedCounty: string;
  suggestedServiceAreas: string[];
  isEditingLocationDetails: boolean;
  onToggleLocationDetails: () => void;
  countyOverride: string;
  onCountyChange: (value: string) => void;
  serviceAreasOverride: string;
  onServiceAreasChange: (value: string) => void;
  onLocationValidationChange: (hasErrors: boolean) => void;
};

export function WelcomeLocationStep({
  googleMapsApiKey,
  currentStep,
  location,
  onLocationChange,
  suggestedCounty,
  suggestedServiceAreas,
  isEditingLocationDetails,
  onToggleLocationDetails,
  countyOverride,
  onCountyChange,
  serviceAreasOverride,
  onServiceAreasChange,
  onLocationValidationChange
}: WelcomeLocationStepProps) {
  return (
    <div className="space-y-6">
      <Label className="flex items-center gap-2 text-xl font-header font-medium text-foreground">
        What is your ZIP code?
      </Label>

      <LocationAutocomplete
        value={location}
        onChange={onLocationChange}
        apiKey={googleMapsApiKey}
        placeholder="Enter your ZIP code"
        autoFillFromGeolocation={currentStep === 3}
      />
      {location && (
        <LocationDetailsPanel
          suggestedCounty={suggestedCounty}
          suggestedServiceAreas={suggestedServiceAreas}
          state={location.state ?? ""}
          isEditing={isEditingLocationDetails}
          onToggleEdit={onToggleLocationDetails}
          countyValue={countyOverride}
          serviceAreasValue={serviceAreasOverride}
          onCountyChange={onCountyChange}
          onServiceAreasChange={onServiceAreasChange}
          onValidationChange={onLocationValidationChange}
        />
      )}
    </div>
  );
}
