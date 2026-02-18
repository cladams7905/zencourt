interface ValidationMessagesProps {
  tooManyAreas: boolean;
  tooLongAreasCount: number;
  hasDuplicates: boolean;
  hasUnknownAreas: boolean;
  unknownAreas: string[];
  parsedServiceAreasCount: number;
  state: string;
}

export const ValidationMessages = ({
  tooManyAreas,
  tooLongAreasCount,
  hasDuplicates,
  hasUnknownAreas,
  unknownAreas,
  parsedServiceAreasCount,
  state
}: ValidationMessagesProps) => {
  return (
    <div className="space-y-1 text-xs">
      {tooManyAreas && (
        <p className="text-destructive text-sm mt-2">
          Limit service areas to 5 or fewer entries.
        </p>
      )}
      {tooLongAreasCount > 0 && (
        <p className="text-destructive text-sm mt-2">
          Each service area must be 40 characters or fewer.
        </p>
      )}
      {hasDuplicates && (
        <p className="text-destructive text-sm mt-2">
          Remove duplicate service area entries.
        </p>
      )}
      {hasUnknownAreas && (
        <p className="text-destructive text-sm mt-2">
          {unknownAreas.length === parsedServiceAreasCount
            ? `None of these match known cities in ${state}.`
            : `Some entries do not match known cities in ${state}: ${unknownAreas
                .slice(0, 3)
                .join(", ")}.`}
        </p>
      )}
    </div>
  );
};
