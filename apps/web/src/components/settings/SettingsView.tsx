"use client";

import * as React from "react";
import type { DBUserAdditional } from "@shared/types/models";
import { DashboardSidebar } from "../dashboard/DashboardSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { AccountTab } from "./AccountTab";
import { BrandingTab } from "./BrandingTab";
import { Button } from "../ui/button";
import { Bell, Mic2, Plus, UserCircle } from "lucide-react";
import { Badge } from "../ui/badge";

interface SettingsViewProps {
  userId: string;
  userAdditional: DBUserAdditional;
  userEmail: string;
  userName: string;
  userAvatar?: string;
  paymentPlan: string;
  location?: string;
}

export function SettingsView({
  userId,
  userAdditional,
  userEmail,
  userName,
  userAvatar,
  paymentPlan,
  location
}: SettingsViewProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <DashboardSidebar
        userName={userName}
        paymentPlan={paymentPlan}
        userAvatar={userAvatar}
      />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        {/* Header with Settings title */}
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur-md px-8 py-5 flex justify-between items-center border-b border-border/50">
          <h1 className="text-2xl font-header font-medium text-foreground">
            Settings
          </h1>

          <div className="flex items-center gap-4">
            <Button size="default" className="gap-2 rounded-full shadow-sm">
              <Plus className="h-5 w-5" />
              <span>New</span>
            </Button>

            <Badge
              variant="outline"
              className="text-sm font-medium px-3 py-1.5 bg-background"
            >
              {location}
            </Badge>

            <Button
              size="icon"
              variant="ghost"
              className="relative hover:bg-accent/20 rounded-full"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-background" />
            </Button>
          </div>
        </header>

        {/* Content with Vertical Tabs */}
        <div className="px-8 py-8 max-w-5xl mx-auto 2xl:-translate-x-24">
          <Tabs
            defaultValue="account"
            orientation="vertical"
            className="flex flex-row gap-8"
          >
            {/* Vertical Tab List */}
            <TabsList className="flex-col h-fit w-48 bg-background/80 backdrop-blur-md p-2 gap-2 sticky top-[110px] border border-border rounded-xl py-2">
              <TabsTrigger
                value="account"
                className="w-full justify-start gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-secondary data-[state=active]:bg-secondary"
              >
                <UserCircle className="h-5 w-5" />
                Account
              </TabsTrigger>
              <TabsTrigger
                value="branding"
                className="w-full justify-start gap-3 py-2 px-3 rounded-lg transition-colors hover:bg-secondary data-[state=active]:bg-secondary"
              >
                <Mic2 className="h-5 w-5" />
                Branding
              </TabsTrigger>
            </TabsList>

            {/* Tab Content */}
            <div className="flex-1">
              <TabsContent value="account" className="mt-0 space-y-6">
                <AccountTab
                  userId={userId}
                  userEmail={userEmail}
                  location={userAdditional.location}
                  paymentPlan={userAdditional.paymentPlan}
                />
              </TabsContent>

              <TabsContent value="branding" className="mt-0 space-y-6">
                <BrandingTab userId={userId} userAdditional={userAdditional} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
