"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../../../ui/card";
import { Badge } from "../../../ui/badge";
import { Button } from "../../../ui/button";
import { Label } from "../../../ui/label";
import { SUBSCRIPTION_PLAN_LABELS } from "@web/src/components/settings/shared";

interface SubscriptionTabProps {
  paymentPlan: string;
}

export function SubscriptionTab({ paymentPlan }: SubscriptionTabProps) {
  const plan = SUBSCRIPTION_PLAN_LABELS[paymentPlan] || {
    label: paymentPlan || "Free",
    color: "secondary"
  };

  return (
    <div className="grid gap-6">
      <Card id="subscription">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Subscription</CardTitle>
          </div>
          <CardDescription>
            Manage your billing and subscription plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Label>Current Plan</Label>
              <div>
                <Badge variant={plan.color} className="text-sm">
                  {plan.label}
                </Badge>
              </div>
            </div>
            <Button variant="default">Manage Subscription</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
