"use client";

import * as React from "react";
import { ViewHeader } from "../view/ViewHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { CreditCard, PenTool, UserCircle } from "lucide-react";
import type { SettingsViewProps } from "@web/src/components/settings/shared";
import {
  buildBrandingPreviewModel,
  useSettingsNavigation
} from "@web/src/components/settings/domain";
import {
  AccountTab,
  BrandingTab,
  BrandingExamplePreviewCard,
  SettingsSupportNote,
  SettingsUnsavedChangesDialog,
  SubscriptionTab
} from "@web/src/components/settings/components";

export function SettingsView({
  userId,
  userAdditional,
  userEmail,
  userName,
  defaultAgentName,
  defaultHeadshotUrl,
  paymentPlan,
  location,
  googleMapsApiKey
}: SettingsViewProps) {
  const { activeTab, setActiveTab } = useSettingsNavigation();
  const [isBrandingDirty, setIsBrandingDirty] = React.useState(false);
  const [isLocationDirty, setIsLocationDirty] = React.useState(false);
  const brandingSaveRef = React.useRef<() => Promise<void>>(async () => {});
  const locationSaveRef = React.useRef<() => Promise<void>>(async () => {});

  const previewModel = React.useMemo(
    () => buildBrandingPreviewModel({ userAdditional, userName, location }),
    [location, userAdditional, userName]
  );

  const handleSaveAllChanges = React.useCallback(async () => {
    if (isBrandingDirty) {
      await brandingSaveRef.current();
    }
    if (isLocationDirty) {
      await locationSaveRef.current();
    }
  }, [isBrandingDirty, isLocationDirty]);

  return (
    <>
      <ViewHeader
        title="Settings"
        subtitle="Manage your account and branding details"
      />

      <div className="px-8 py-8 max-w-5xl mx-auto">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          orientation="vertical"
          className="flex flex-row gap-8 min-w-0"
        >
          <div className="sticky top-[124px] flex w-56 flex-col gap-4 self-start">
            <TabsList className="flex-col h-fit w-full bg-secondary border border-border p-2 gap-2 py-2">
              <TabsTrigger
                value="account"
                className="w-full justify-start gap-3 py-2 px-3 rounded-lg transition-all text-muted-foreground hover:text-foreground data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:border-border/60"
              >
                <UserCircle className="h-5 w-5" />
                Account
              </TabsTrigger>
              <TabsTrigger
                value="branding"
                className="w-full justify-start gap-3 py-2 px-3 rounded-lg transition-all text-muted-foreground hover:text-foreground data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:border-border/60"
              >
                <PenTool className="h-5 w-5" />
                Branding
              </TabsTrigger>
              <TabsTrigger
                value="subscription"
                className="w-full justify-start gap-3 py-2 px-3 rounded-lg transition-all text-muted-foreground hover:text-foreground data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:border-border/60"
              >
                <CreditCard className="h-5 w-5" />
                Subscription
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="branding"
              forceMount
              className="mt-0 data-[state=inactive]:hidden border-b-0"
            >
              <BrandingExamplePreviewCard
                writingToneLabel={previewModel.writingToneLabel}
                headline={previewModel.headline}
                writingStyleNote={previewModel.writingStyleNote}
                signature={previewModel.signature}
              />
            </TabsContent>

            <SettingsSupportNote />
          </div>

          <div className="flex-1 min-w-0">
            <TabsContent value="account" className="mt-0 space-y-6">
              <AccountTab
                userId={userId}
                userEmail={userEmail}
                location={userAdditional.location}
                googleMapsApiKey={googleMapsApiKey}
                onDirtyChange={setIsLocationDirty}
                onRegisterSave={(save) => {
                  locationSaveRef.current = save;
                }}
              />
            </TabsContent>

            <TabsContent
              value="branding"
              forceMount
              className="mt-0 space-y-6 data-[state=inactive]:hidden"
            >
              <BrandingTab
                userId={userId}
                userAdditional={userAdditional}
                defaultAgentName={defaultAgentName}
                defaultHeadshotUrl={defaultHeadshotUrl}
                onDirtyChange={setIsBrandingDirty}
                onRegisterSave={(save) => {
                  brandingSaveRef.current = save;
                }}
                isActive={activeTab === "branding"}
              />
            </TabsContent>

            <TabsContent value="subscription" className="mt-0 space-y-6">
              <SubscriptionTab paymentPlan={paymentPlan} />
            </TabsContent>
          </div>
        </Tabs>
      </div>

      <SettingsUnsavedChangesDialog
        isDirty={isBrandingDirty || isLocationDirty}
        onSave={handleSaveAllChanges}
      />
    </>
  );
}
