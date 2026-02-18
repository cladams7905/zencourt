"use client";

import * as React from "react";
import { ViewHeader } from "../../view/ViewHeader";
import { Badge } from "../../ui/badge";
import { Button } from "../../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from "../../ui/card";
import { UploadDialog } from "../../uploads/UploadDialog";
import {
  IMAGE_UPLOAD_LIMIT,
  MAX_IMAGE_BYTES,
  MAX_IMAGES_PER_ROOM
} from "@shared/utils/mediaUpload";
import { useRouter } from "next/navigation";
import {
  formatBytes,
  validateImageFile
} from "@web/src/components/listings/sync/domain";
import { useSyncUploadFlow } from "@web/src/components/listings/sync/domain/hooks";

interface ListingSyncViewProps {
  userId: string;
}

export function ListingSyncView({ userId }: ListingSyncViewProps) {
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const {
    getUploadUrls,
    buildRecordInput,
    onCreateRecords,
    onUploadsComplete
  } = useSyncUploadFlow({
    userId,
    navigate: router.push
  });

  return (
    <>
      <ViewHeader
        title="Listing Campaigns"
        subtitle="Sync listings to generate social campaigns faster."
      />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-8 py-10">
        <section className="rounded-lg border border-border bg-secondary p-6">
          <h2 className="text-xl font-header font-medium text-foreground">
            Choose how to add your listings
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Start with an MLS sync or manually upload listing details to build a
            campaign.
          </p>
        </section>

        <div className="grid gap-6 md:grid-cols-2">
          <Card className="border-border">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>Sync from MLS</CardTitle>
                <Badge variant="secondary">Recommended</Badge>
              </div>
              <CardDescription>
                Connect your MLS to import active listings and generate social
                campaigns automatically.
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

          <Card className="border-border">
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
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsUploadOpen(true)}
              >
                Upload manually
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      <UploadDialog
        open={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        title="Upload listing photos"
        description={`Add images up to ${formatBytes(MAX_IMAGE_BYTES)}.`}
        accept="image/*"
        dropTitle="Drag & drop photos here"
        dropSubtitle="or click to select multiple images"
        primaryActionLabel="Upload photos"
        selectedLabel="photo"
        errorMessage="Failed to upload photos. Please try again."
        tipsTitle="What photos should I upload?"
        tipsItems={[
          `No more than ${IMAGE_UPLOAD_LIMIT} listing photos may be uploaded per listing.`,
          `Limit each room category to ${MAX_IMAGES_PER_ROOM} photos for video generation.`,
          "Include a wide variety well-framed shots of key rooms and exterior."
        ]}
        maxFiles={IMAGE_UPLOAD_LIMIT}
        maxImageBytes={MAX_IMAGE_BYTES}
        compressDriveImages
        compressOversizeImages
        fileMetaLabel={(file: File) => formatBytes(file.size)}
        fileValidator={validateImageFile}
        getUploadUrls={getUploadUrls}
        buildRecordInput={buildRecordInput}
        onCreateRecords={onCreateRecords}
        onUploadsComplete={onUploadsComplete}
      />
    </>
  );
}
