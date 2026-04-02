"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  ListingStageFooter,
  ListingStageShell
} from "@web/src/components/listings/stage/shared";
import { useRouter } from "next/navigation";
import { Button } from "@web/src/components/ui/button";
import {
  ARCHITECTURE_OPTIONS,
  LOT_TYPE_OPTIONS,
  PROPERTY_TYPE_OPTIONS,
  STREET_TYPE_OPTIONS
} from "@web/src/components/listings/stage/review/shared/constants";
import type { ListingReviewViewProps } from "@web/src/components/listings/stage/review/shared/types";
import {
  useReviewAutoSave,
  useReviewDetailsState,
  useReviewStageActions,
  useReviewValidation
} from "@web/src/components/listings/stage/review/domain/hooks";
import { useReviewProcessingFlow } from "@web/src/components/listings/stage/processing/domain/hooks";
import {
  ReviewConfirmContinueDialog,
  ReviewExteriorFeaturesCard,
  ReviewInteriorFeaturesCard,
  ReviewLocationContextCard,
  ReviewOpenHouseEventsCard,
  ReviewPropertyBasicsCard,
  ReviewSaleHistoryCard,
  ReviewSidebarActions,
  ReviewSourcesDialog,
  ReviewValuationEstimatesCard
} from "@web/src/components/listings/stage/review";

export function ListingReviewView({
  listingId,
  address,
  propertyDetails,
  targetAudiences
}: ListingReviewViewProps) {
  const router = useRouter();
  const reviewRoute = `/listings/${listingId}/stage/review`;
  const navigate = React.useCallback(
    (path: string) => {
      if (path === reviewRoute) {
        router.refresh();
        return;
      }
      router.replace(path);
    },
    [reviewRoute, router]
  );
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
    setOpenHouseEvents,
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
      navigate,
      handleSave
    });

  const exterior = details.exterior_features ?? {};
  const interior = details.interior_features ?? {};
  const kitchen = interior.kitchen ?? {};
  const primarySuite = interior.primary_suite ?? {};
  const valuation = details.valuation_estimates ?? {};
  const locationContext = details.location_context ?? {};

  const openHouseEvents = details.open_house_events ?? [];
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

  const [isContinueDialogOpen, setIsContinueDialogOpen] = React.useState(false);
  const isInlineProcessing = !propertyDetails;
  const {
    status: reviewProcessingStatus,
    errorMessage: reviewProcessingError,
    fetchDetails,
    handleSkip
  } = useReviewProcessingFlow({
    mode: "review",
    listingId,
    address,
    navigate
  });

  return (
    <>
    <ListingStageShell
      stage="review"
      wide
      headerAction={
        isSaving ? (
          <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/80 px-3 py-1.5 text-xs font-medium text-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Saving...
          </div>
        ) : null
      }
      footer={
        isInlineProcessing ? (
          <ListingStageFooter
            onBack={() => void handleGoBack()}
            canBack={!isGoingBack}
          />
        ) : (
          <ListingStageFooter
            onBack={() => void handleGoBack()}
            canBack={!isGoingBack}
            onContinue={() => setIsContinueDialogOpen(true)}
            canContinue={canContinue && !isSaving}
            isSubmitting={isSaving}
          />
        )
      }
    >
      {isInlineProcessing ? (
        <div className="mx-auto flex min-h-[calc(100vh-220px)] w-full items-center justify-center py-6">
          <div className="w-full max-w-[520px] space-y-6 rounded-xl border border-border bg-background p-6 text-center shadow-xs transition-all hover:shadow-md">
            <div className="mx-auto mt-2 flex items-center justify-center">
              {reviewProcessingStatus === "error" ? (
                <AlertTriangle size={32} className="text-destructive" />
              ) : (
                <Loader2 size={40} className="animate-spin text-foreground" />
              )}
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-header text-foreground">
                {reviewProcessingStatus === "error"
                  ? "Property lookup failed"
                  : "Fetching property details"}
              </h2>
              <div className="my-3 gap-3">
                <p className="text-sm text-muted-foreground">
                  {reviewProcessingStatus === "error"
                    ? "We could not fetch IDX details. You can retry or fill in details manually."
                    : "We’re pulling public IDX records for review."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {address || "Address on file"}
                </p>
              </div>
            </div>
            <div className="h-px w-full bg-border" />
            <p className="text-xs text-muted-foreground">
              This usually takes a few moments. Please keep this tab open.
            </p>
            {reviewProcessingStatus === "error" && reviewProcessingError ? (
              <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
                {reviewProcessingError}
              </div>
            ) : null}
            {reviewProcessingStatus === "error" ? (
              <div className="flex flex-col gap-2">
                <Button onClick={fetchDetails}>Retry fetch</Button>
                <Button variant="outline" onClick={handleSkip}>
                  Review manually
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-6">
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

              <ReviewOpenHouseEventsCard
                openHouseEvents={openHouseEvents}
                setOpenHouseEvents={setOpenHouseEvents}
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

            <aside className="mt-14 w-full lg:w-72">
              <div className="sticky top-[124px] space-y-4">
                <ReviewSidebarActions requiredFixes={requiredFixes} />
              </div>
            </aside>
          </div>
        </div>
      )}
    </ListingStageShell>
    {!isInlineProcessing ? (
      <ReviewConfirmContinueDialog
        open={isContinueDialogOpen}
        onOpenChange={setIsContinueDialogOpen}
        onConfirm={handleConfirmContinue}
        canConfirm={canContinue}
      />
    ) : null}
    </>
  );
}
