"use client";

import { ViewHeader } from "../dashboard/ViewHeader";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "../ui/card";

export function ListingSyncView() {
  return (
    <>
      <ViewHeader
        title="Listing Campaigns"
        subtitle="Sync listings to generate social campaigns faster."
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-8 py-10">
        <section className="rounded-lg border border-border/60 bg-secondary p-6">
          <h2 className="text-xl font-header font-medium text-foreground">
            Choose how to add your listings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start with an MLS sync or manually upload listing details to build a
            campaign.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border/60">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Sync from MLS</CardTitle>
                <Badge variant="secondary" className="">
                  Recommended
                </Badge>
              </div>
              <CardDescription>
                Connect your MLS to import active listings and keep campaigns
                updated automatically.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We will pull listing photos, price, location, and key details
                once you connect.
              </p>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Connect MLS</Button>
            </CardFooter>
          </Card>

          <Card className="border-border/60">
            <CardHeader>
              <CardTitle>Manual upload</CardTitle>
              <CardDescription>
                Add listing photos and details yourself to start a campaign
                right away.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Upload media, add listing highlights, and we will turn it into a
                social-ready campaign.
              </p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                Upload manually
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    </>
  );
}
