import * as React from "react";
import type {
  ListingPropertyDetails,
  ListingOpenHouseEvent,
  ListingSaleHistory,
  ListingValuationExample
} from "@shared/types/models";
import {
  ARCHITECTURE_OPTIONS,
  LOT_TYPE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  STREET_TYPE_OPTIONS
} from "@web/src/components/listings/review/shared/constants";
import { formatListingPrice } from "@web/src/components/listings/review/shared/formatters";
import type { SelectMode } from "@web/src/components/listings/review/shared/types";

type UseReviewDetailsStateParams = {
  propertyDetails: ListingPropertyDetails | null;
  address: string | null;
};

export const useReviewDetailsState = ({
  propertyDetails,
  address
}: UseReviewDetailsStateParams) => {
  const [details, setDetails] = React.useState<ListingPropertyDetails>(() => ({
    ...(propertyDetails ?? {}),
    address: propertyDetails?.address ?? address ?? ""
  }));
  const [priceValue, setPriceValue] = React.useState(() => {
    const raw = propertyDetails?.listing_price;
    return raw !== undefined && raw !== null
      ? formatListingPrice(String(raw))
      : "";
  });
  const detailsRef = React.useRef(details);
  const dirtyRef = React.useRef(false);

  const [propertyTypeMode, setPropertyTypeMode] = React.useState<SelectMode>(
    () => {
      const current = (propertyDetails?.property_type ?? "").trim();
      if (current && !PROPERTY_TYPE_OPTIONS.includes(current)) {
        return "custom";
      }
      return "preset";
    }
  );
  const [architectureMode, setArchitectureMode] = React.useState<SelectMode>(
    () => {
      const current = (propertyDetails?.architecture ?? "").trim();
      if (current && !ARCHITECTURE_OPTIONS.includes(current)) {
        return "custom";
      }
      return "preset";
    }
  );
  const [propertyTypeCustom, setPropertyTypeCustom] = React.useState(
    () => details.property_type ?? ""
  );
  const [architectureCustom, setArchitectureCustom] = React.useState(
    () => details.architecture ?? ""
  );
  const [streetTypeMode, setStreetTypeMode] = React.useState<SelectMode>(() => {
    const current = (propertyDetails?.location_context?.street_type ?? "").trim();
    if (current && !STREET_TYPE_OPTIONS.includes(current)) {
      return "custom";
    }
    return "preset";
  });
  const [streetTypeCustom, setStreetTypeCustom] = React.useState(
    () => propertyDetails?.location_context?.street_type ?? ""
  );
  const [lotTypeMode, setLotTypeMode] = React.useState<SelectMode>(() => {
    const current = (propertyDetails?.location_context?.lot_type ?? "").trim();
    if (current && !LOT_TYPE_OPTIONS.includes(current)) {
      return "custom";
    }
    return "preset";
  });
  const [lotTypeCustom, setLotTypeCustom] = React.useState(
    () => propertyDetails?.location_context?.lot_type ?? ""
  );

  React.useEffect(() => {
    const raw = details.listing_price;
    setPriceValue(
      raw !== undefined && raw !== null ? formatListingPrice(String(raw)) : ""
    );
  }, [details.listing_price]);

  React.useEffect(() => {
    const currentStreet = (details.location_context?.street_type ?? "").trim();
    if (currentStreet && !STREET_TYPE_OPTIONS.includes(currentStreet)) {
      setStreetTypeMode("custom");
      setStreetTypeCustom(currentStreet);
    } else {
      setStreetTypeMode("preset");
      setStreetTypeCustom(currentStreet);
    }
  }, [details.location_context?.street_type]);

  React.useEffect(() => {
    const currentLot = (details.location_context?.lot_type ?? "").trim();
    if (currentLot && !LOT_TYPE_OPTIONS.includes(currentLot)) {
      setLotTypeMode("custom");
      setLotTypeCustom(currentLot);
    } else {
      setLotTypeMode("preset");
      setLotTypeCustom(currentLot);
    }
  }, [details.location_context?.lot_type]);

  const updateDetails = React.useCallback(
    (updater: (prev: ListingPropertyDetails) => ListingPropertyDetails) => {
      setDetails((prev) => {
        const next = updater(prev ?? {});
        detailsRef.current = next;
        return next;
      });
      dirtyRef.current = true;
    },
    []
  );

  const updateSection = React.useCallback(
    <T extends keyof ListingPropertyDetails>(
      key: T,
      updater: (
        prev: NonNullable<ListingPropertyDetails[T]>
      ) => NonNullable<ListingPropertyDetails[T]>
    ) => {
      updateDetails((prev) => {
        const current = (prev[key] ?? {}) as NonNullable<ListingPropertyDetails[T]>;
        return {
          ...prev,
          [key]: updater(current)
        };
      });
    },
    [updateDetails]
  );

  const setSaleHistory = React.useCallback(
    (next: ListingSaleHistory[]) => {
      updateDetails((prev) => ({
        ...prev,
        sale_history: next.length > 0 ? next : null
      }));
    },
    [updateDetails]
  );

  const setOpenHouseEvents = React.useCallback(
    (next: ListingOpenHouseEvent[]) => {
      updateDetails((prev) => ({
        ...prev,
        open_house_events: next.length > 0 ? next : null
      }));
    },
    [updateDetails]
  );

  const setValuationExamples = React.useCallback(
    (next: ListingValuationExample[]) => {
      updateSection("valuation_estimates", (prev) => ({
        ...prev,
        third_party_examples: next.length > 0 ? next : null
      }));
    },
    [updateSection]
  );

  return {
    details,
    setDetails,
    detailsRef,
    dirtyRef,
    priceValue,
    setPriceValue,
    propertyTypeMode,
    setPropertyTypeMode,
    architectureMode,
    setArchitectureMode,
    propertyTypeCustom,
    setPropertyTypeCustom,
    architectureCustom,
    setArchitectureCustom,
    streetTypeMode,
    setStreetTypeMode,
    streetTypeCustom,
    setStreetTypeCustom,
    lotTypeMode,
    setLotTypeMode,
    lotTypeCustom,
    setLotTypeCustom,
    updateDetails,
    updateSection,
    setSaleHistory,
    setOpenHouseEvents,
    setValuationExamples
  };
};
