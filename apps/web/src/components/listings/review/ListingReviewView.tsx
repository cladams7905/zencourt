"use client";

import * as React from "react";
import { ListingViewHeader } from "@web/src/components/listings/shared";
import { Loader2 } from "lucide-react";
import {
  ListingTimeline,
  buildListingStageSteps
} from "@web/src/components/listings/shared";
import { useRouter } from "next/navigation";
import {
  ARCHITECTURE_OPTIONS,
  LOT_TYPE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  STREET_TYPE_OPTIONS
} from "@web/src/components/listings/review/shared/constants";
import type { ListingReviewViewProps } from "@web/src/components/listings/review/shared/types";
import {
  useReviewAutoSave,
  useReviewDetailsState,
  useReviewStageActions,
  useReviewValidation
} from "@web/src/components/listings/review/domain/hooks";
import {
  ReviewExteriorFeaturesCard,
  ReviewInteriorFeaturesCard,
  ReviewLocationContextCard,
  ReviewPropertyBasicsCard,
  ReviewSaleHistoryCard,
  ReviewSidebarActions,
  ReviewSourcesDialog,
  ReviewValuationEstimatesCard
} from "@web/src/components/listings/review/components";

export function ListingReviewView({
  listingId,
  title,
  address,
  propertyDetails,
  targetAudiences
}: ListingReviewViewProps) {
  const router = useRouter();
  const {
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
    setValuationExamples
  } = useReviewDetailsState({
    propertyDetails,
    address
  });
  const { isSaving, handleSave, triggerAutoSave, normalizeBathrooms } =
    useReviewAutoSave({
      listingId,
      detailsRef,
      dirtyRef,
      updateDetails
    });
  const { isGoingBack, handleConfirmContinue, handleGoBack } =
    useReviewStageActions({
      listingId,
      navigate: router.push,
      handleSave
    });

  const exterior = details.exterior_features ?? {};
  const interior = details.interior_features ?? {};
  const kitchen = interior.kitchen ?? {};
  const primarySuite = interior.primary_suite ?? {};
  const valuation = details.valuation_estimates ?? {};
  const locationContext = details.location_context ?? {};

  const saleHistory = details.sale_history ?? [];
  const valuationExamples = valuation.third_party_examples ?? [];
  const sources = details.sources ?? [];
  const { showInvestorFields, requiredFixes, canContinue } =
    useReviewValidation({
      details,
      targetAudiences
    });

  const propertyTypeOptions = React.useMemo(
    () => [...PROPERTY_TYPE_OPTIONS, "Custom"],
    []
  );

  const architectureOptions = React.useMemo(
    () => [...ARCHITECTURE_OPTIONS, "Custom"],
    []
  );
  const streetTypeOptions = React.useMemo(
    () => [...STREET_TYPE_OPTIONS, "Custom"],
    []
  );
  const lotTypeOptions = React.useMemo(
    () => [...LOT_TYPE_OPTIONS, "Custom"],
    []
  );

  return (
    <>
      <ListingViewHeader
        title={title}
        timeline={
          <ListingTimeline
            steps={buildListingStageSteps("review")}
            className="mb-0"
          />
        }
        action={
          isSaving ? (
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </div>
          ) : null
        }
      />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-8 py-10">
        <div className="flex flex-col gap-8 lg:flex-row">
          <section className="flex-1 space-y-6">
            <div className="flex w-full items-center gap-3">
              <h2 className="text-xl font-header text-foreground">
                Review Property Details
              </h2>
              <ReviewSourcesDialog sources={sources} />
            </div>
            <ReviewPropertyBasicsCard
              details={details}
              detailsRef={detailsRef}
              dirtyRef={dirtyRef}
              setDetails={setDetails}
              priceValue={priceValue}
              setPriceValue={setPriceValue}
              propertyTypeMode={propertyTypeMode}
              setPropertyTypeMode={setPropertyTypeMode}
              propertyTypeCustom={propertyTypeCustom}
              setPropertyTypeCustom={setPropertyTypeCustom}
              architectureMode={architectureMode}
              setArchitectureMode={setArchitectureMode}
              architectureCustom={architectureCustom}
              setArchitectureCustom={setArchitectureCustom}
              propertyTypeOptions={propertyTypeOptions}
              architectureOptions={architectureOptions}
              updateDetails={updateDetails}
              triggerAutoSave={triggerAutoSave}
              normalizeBathrooms={normalizeBathrooms}
              handleSave={handleSave}
            />

            <ReviewExteriorFeaturesCard
              exterior={exterior}
              updateSection={updateSection}
              triggerAutoSave={triggerAutoSave}
            />

            <ReviewInteriorFeaturesCard
              details={details}
              kitchen={kitchen}
              primarySuite={primarySuite}
              updateDetails={updateDetails}
              updateSection={updateSection}
              triggerAutoSave={triggerAutoSave}
            />

            {showInvestorFields ? (
              <ReviewSaleHistoryCard
                saleHistory={saleHistory}
                setSaleHistory={setSaleHistory}
                triggerAutoSave={triggerAutoSave}
              />
            ) : null}

            {showInvestorFields ? (
              <ReviewValuationEstimatesCard
                valuation={valuation}
                valuationExamples={valuationExamples}
                setValuationExamples={setValuationExamples}
                updateSection={updateSection}
                triggerAutoSave={triggerAutoSave}
              />
            ) : null}

            <ReviewLocationContextCard
              locationContext={locationContext}
              lotTypeMode={lotTypeMode}
              setLotTypeMode={setLotTypeMode}
              lotTypeCustom={lotTypeCustom}
              setLotTypeCustom={setLotTypeCustom}
              lotTypeOptions={lotTypeOptions}
              streetTypeMode={streetTypeMode}
              setStreetTypeMode={setStreetTypeMode}
              streetTypeCustom={streetTypeCustom}
              setStreetTypeCustom={setStreetTypeCustom}
              streetTypeOptions={streetTypeOptions}
              updateSection={updateSection}
              triggerAutoSave={triggerAutoSave}
            />
          </section>

          <aside className="w-full lg:w-72 mt-14">
            <div className="sticky top-[124px] space-y-4">
              <ReviewSidebarActions
                requiredFixes={requiredFixes}
                canContinue={canContinue}
                isSaving={isSaving}
                isGoingBack={isGoingBack}
                onConfirmContinue={handleConfirmContinue}
                onGoBack={handleGoBack}
              />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
