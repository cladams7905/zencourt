import * as React from "react";
import {
  MAX_SERVICE_AREAS_EDIT_LIMIT,
  MAX_SERVICE_AREA_LENGTH
} from "@web/src/components/location/shared/constants";
import {
  getCityNameSetForState,
  getCountyNameSetForState,
  normalizeCountyName
} from "@web/src/lib/domain/location/cityDataset";

interface UseLocationDetailsValidationArgs {
  state: string;
  countyValue: string;
  serviceAreasValue: string;
  onValidationChange?: (hasErrors: boolean) => void;
}

export const useLocationDetailsValidation = ({
  state,
  countyValue,
  serviceAreasValue,
  onValidationChange
}: UseLocationDetailsValidationArgs) => {
  const [knownCitySet, setKnownCitySet] = React.useState<Set<string> | null>(
    null
  );
  const [knownCountySet, setKnownCountySet] = React.useState<
    Set<string> | null
  >(null);

  const parsedServiceAreas = React.useMemo(
    () =>
      serviceAreasValue
        .split(",")
        .map((area) => area.trim())
        .filter(Boolean),
    [serviceAreasValue]
  );

  const normalizedAreas = React.useMemo(
    () => parsedServiceAreas.map((area) => area.toLowerCase()),
    [parsedServiceAreas]
  );

  const normalizedCounty = React.useMemo(
    () => normalizeCountyName(countyValue).toLowerCase(),
    [countyValue]
  );

  const tooManyAreas = parsedServiceAreas.length > MAX_SERVICE_AREAS_EDIT_LIMIT;
  const tooLongAreas = parsedServiceAreas.filter(
    (area) => area.length > MAX_SERVICE_AREA_LENGTH
  );

  const hasDuplicates =
    normalizedAreas.length > 0 &&
    new Set(normalizedAreas).size !== normalizedAreas.length;

  const countyInvalid =
    normalizedCounty.length > 0 &&
    knownCountySet !== null &&
    !knownCountySet.has(normalizedCounty);

  const unknownAreas = React.useMemo(() => {
    if (!knownCitySet || parsedServiceAreas.length === 0) {
      return [];
    }

    return parsedServiceAreas.filter(
      (area) => !knownCitySet.has(area.toLowerCase())
    );
  }, [knownCitySet, parsedServiceAreas]);

  const hasUnknownAreas = unknownAreas.length > 0;
  const hasErrors =
    tooManyAreas ||
    tooLongAreas.length > 0 ||
    hasDuplicates ||
    countyInvalid ||
    hasUnknownAreas;

  React.useEffect(() => {
    if (!state) {
      setKnownCitySet(null);
      setKnownCountySet(null);
      return;
    }

    let isActive = true;

    Promise.all([getCityNameSetForState(state), getCountyNameSetForState(state)])
      .then(([citySet, countySet]) => {
        if (isActive) {
          setKnownCitySet(citySet);
          setKnownCountySet(countySet);
        }
      })
      .catch(() => {
        if (isActive) {
          setKnownCitySet(null);
          setKnownCountySet(null);
        }
      });

    return () => {
      isActive = false;
    };
  }, [state]);

  React.useEffect(() => {
    onValidationChange?.(hasErrors);
  }, [hasErrors, onValidationChange]);

  return {
    knownCountySet,
    normalizedCounty,
    parsedServiceAreas,
    tooManyAreas,
    tooLongAreas,
    hasDuplicates,
    unknownAreas,
    hasUnknownAreas,
    hasErrors
  };
};
