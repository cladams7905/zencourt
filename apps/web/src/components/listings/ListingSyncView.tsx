"use client";

import * as React from "react";
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
import { UploadDialog } from "../uploads/UploadDialog";
import { MAX_IMAGE_BYTES } from "@shared/utils/mediaUpload";
import {
  createDraftListing,
  createListingImageRecords,
  getListingImageUploadUrls
} from "@web/src/server/actions/db/listings";
import { useRouter } from "next/navigation";

interface ListingSyncViewProps {
  userId: string;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
};

export function ListingSyncView({ userId }: ListingSyncViewProps) {
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = React.useState(false);
  const [listingId, setListingId] = React.useState<string | null>(null);
  const listingIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    listingIdRef.current = listingId;
  }, [listingId]);

  const ensureListingId = React.useCallback(async () => {
    if (listingIdRef.current) {
      return listingIdRef.current;
    }

    const listing = await createDraftListing(userId);
    if (!listing?.id) {
      throw new Error("Draft listing could not be created.");
    }
    listingIdRef.current = listing.id;
    setListingId(listing.id);
    return listing.id;
  }, [userId]);

  const handleCreateRecords = React.useCallback(
    async (
      records: Array<{ key: string; fileName: string; publicUrl: string }>
    ) => {
      const activeListingId = listingIdRef.current;
      if (!activeListingId) {
        throw new Error("Listing is missing for upload.");
      }
      await createListingImageRecords(userId, activeListingId, records);
    },
    [userId]
  );

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
        fileMetaLabel={(file) => formatBytes(file.size)}
        fileValidator={(file) => {
          if (file.type.startsWith("image/")) {
            return { accepted: true };
          }
          return { accepted: false, error: "Only image files are supported." };
        }}
        getUploadUrls={async (requests) => {
          const activeListingId = await ensureListingId();
          return getListingImageUploadUrls(userId, activeListingId, requests);
        }}
        buildRecordInput={({ upload }) => {
          if (!upload.fileName || !upload.publicUrl) {
            throw new Error("Listing upload is missing metadata.");
          }
          return {
            key: upload.key,
            fileName: upload.fileName,
            publicUrl: upload.publicUrl
          };
        }}
        onCreateRecords={handleCreateRecords}
        onSuccess={() => {
          const activeListingId = listingIdRef.current;
          if (activeListingId) {
            router.push(`/listings/${activeListingId}`);
          }
        }}
      />
    </>
  );
}
