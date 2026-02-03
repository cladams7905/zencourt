"use client";

import * as React from "react";
import type { DBUserAdditional } from "@shared/types/models";
import { ViewHeader } from "../dashboard/ViewHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AccountTab } from "./AccountTab";
import { BrandingTab } from "./BrandingTab";
import { SubscriptionTab } from "./SubscriptionTab";
import { SettingsUnsavedChangesDialog } from "./SettingsUnsavedChangesDialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "../ui/accordion";
import { Card } from "../ui/card";
import { CreditCard, PenTool, UserCircle } from "lucide-react";

interface SettingsViewProps {
  userId: string;
  userAdditional: DBUserAdditional;
  userEmail: string;
  userName: string;
  defaultAgentName?: string;
  defaultHeadshotUrl?: string;
  paymentPlan: string;
  location?: string;
  googleMapsApiKey: string;
}

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
  const [activeTab, setActiveTab] = React.useState("account");
  const [pendingHash, setPendingHash] = React.useState<string | null>(null);
  const [isBrandingDirty, setIsBrandingDirty] = React.useState(false);
  const [isLocationDirty, setIsLocationDirty] = React.useState(false);
  const brandingSaveRef = React.useRef<() => Promise<void>>(async () => {});
  const locationSaveRef = React.useRef<() => Promise<void>>(async () => {});

  const handleSaveAllChanges = React.useCallback(async () => {
    if (isBrandingDirty) {
      await brandingSaveRef.current();
    }
    if (isLocationDirty) {
      await locationSaveRef.current();
    }
  }, [isBrandingDirty, isLocationDirty]);

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncFromHash = () => {
      const hash = window.location.hash;
      if (!hash) {
        return;
      }
      const tabFromHash: Record<string, string> = {
        "#account": "account",
        "#profile": "branding",
        "#writing-style": "branding",
        "#media": "branding",
        "#target-audiences": "branding",
        "#subscription": "subscription"
      };
      setPendingHash(hash);
      const nextTab = tabFromHash[hash];
      if (nextTab) {
        setActiveTab(nextTab);
      }
    };

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  React.useEffect(() => {
    if (!pendingHash) {
      return;
    }
    window.requestAnimationFrame(() => {
      const targetId = pendingHash.replace("#", "");
      const element = document.getElementById(targetId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      setPendingHash(null);
    });
  }, [activeTab, pendingHash]);
  const agentName = userAdditional.agentName || userName;
  const brokerageName = userAdditional.brokerageName || "Your Brokerage";
  const agentTitle = userAdditional.agentTitle || "";
  const writingTone = userAdditional.writingToneLevel;
  const writingToneLabel = (() => {
    const numeric = Number(writingTone);
    if (!Number.isNaN(numeric)) {
      const scaleLabels: Record<number, string> = {
        1: "Very informal",
        2: "Informal",
        3: "Conversational",
        4: "Formal",
        5: "Very formal"
      };
      return scaleLabels[numeric] ?? "Custom";
    }
    const legacyLabels: Record<string, string> = {
      professional: "Professional",
      casual: "Casual",
      friendly: "Friendly",
      enthusiastic: "Enthusiastic",
      educational: "Educational"
    };
    return (writingTone && legacyLabels[writingTone]) || "Custom";
  })();
  const writingStyleNote = userAdditional.writingStyleCustom?.trim();
  const headline = location
    ? `Just Listed in ${location}`
    : "Just Listed: A Fresh New Opportunity";
  const signature = [agentName, agentTitle, brokerageName]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <ViewHeader
        title="Settings"
        subtitle="Manage your account and branding details"
      />

      <div className="px-8 py-8 max-w-5xl mx-auto">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          orientation="vertical"
          className="flex flex-row gap-8 min-w-0"
        >
          {/* Vertical Tab List + Preview */}
          <div className="sticky top-[124px] flex w-56 flex-col gap-4 self-start">
            <TabsList className="flex-col h-fit w-full bg-secondary border border-border p-2 gap-2 py-2">
              <TabsTrigger
                value="account"
                className="w-full justify-start gap-3 py-2 px-3 rounded-lg transition-all text-muted-foreground hover:text-foreground data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:border-border"
              >
                <UserCircle className="h-5 w-5" />
                Account
              </TabsTrigger>
              <TabsTrigger
                value="branding"
                className="w-full justify-start gap-3 py-2 px-3 rounded-lg transition-all text-muted-foreground hover:text-foreground data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:border-border"
              >
                <PenTool className="h-5 w-5" />
                Branding
              </TabsTrigger>
              <TabsTrigger
                value="subscription"
                className="w-full justify-start gap-3 py-2 px-3 rounded-lg transition-all text-muted-foreground hover:text-foreground data-[state=active]:shadow-sm data-[state=active]:text-foreground data-[state=active]:bg-background data-[state=active]:border-border"
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
              <Card className="bg-secondary border-border shadow-none!">
                <Accordion type="single" className="border-b-0" collapsible>
                  <AccordionItem
                    value="example"
                    className="border-b-0 hover:shadow-none!"
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline font-body">
                      <div className="flex flex-col text-left gap-1">
                        <span className="text-base font-header">
                          Example Post
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Preview based on your current preferences.
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4 hover:shadow-none">
                      <div className="space-y-3 text-sm">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          {writingToneLabel} Tone
                        </div>
                        <div className="font-semibold text-foreground">
                          {headline}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Discover a home that balances comfort and style,
                          curated for modern living. Reach out for a private
                          walkthrough and neighborhood insights.
                        </p>
                        {writingStyleNote ? (
                          <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                            {writingStyleNote}
                          </div>
                        ) : null}
                        <div className="text-xs text-muted-foreground">
                          {signature}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </Card>
            </TabsContent>

            <p className="text-xs text-muted-foreground pl-2">
              Have a question about your account? Email{" "}
              <a
                href="mailto:team@zencourt.ai"
                className="text-foreground underline"
              >
                team@zencourt.ai
              </a>
              .
            </p>
          </div>

          {/* Tab Content */}
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
