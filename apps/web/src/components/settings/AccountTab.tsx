"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../ui/card";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Mail, MapPin, CreditCard, Shield } from "lucide-react";

interface AccountTabProps {
  userId: string;
  userEmail: string;
  location: string | null;
  paymentPlan: string;
}

export function AccountTab({
  userEmail,
  location,
  paymentPlan
}: AccountTabProps) {
  const paymentPlanLabels: Record<string, { label: string; color: string }> = {
    free: { label: "Free", color: "secondary" },
    starter: { label: "Starter", color: "default" },
    growth: { label: "Growth", color: "default" },
    enterprise: { label: "Enterprise", color: "default" }
  };

  const plan = paymentPlanLabels[paymentPlan] || paymentPlanLabels.free;

  return (
    <div className="grid gap-6">
      {/* Authentication */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Authentication</CardTitle>
          </div>
          <CardDescription>
            Manage your login credentials and authentication method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Authentication Type</Label>
            <div className="flex items-center gap-2">
              <Badge variant="outline">Email & Password</Badge>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  Email
                </div>
              </Label>
              <Input
                id="email"
                type="email"
                value={userEmail}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value="••••••••"
                disabled
                className="bg-muted"
              />
              <Button variant="link" size="sm" className="h-auto p-0">
                Change password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Location</CardTitle>
          </div>
          <CardDescription>
            Your service area for market insights and content generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="location">Current Location</Label>
            <Input
              id="location"
              value={location || "Not set"}
              disabled
              className="bg-muted"
            />
            <p className="text-sm text-muted-foreground">
              Location was set during onboarding. Contact support to update.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Subscription</CardTitle>
          </div>
          <CardDescription>
            Manage your billing and subscription plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label>Current Plan</Label>
              <div>
                <Badge variant="secondary">{plan.label}</Badge>
              </div>
            </div>
            <Button variant="outline">Manage Subscription</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
