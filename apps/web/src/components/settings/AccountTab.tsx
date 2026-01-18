"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "../ui/card";
import { useStackApp, useUser } from "@stackframe/stack";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Mail } from "lucide-react";
import { LoadingImage } from "../ui/loading-image";
import { toast } from "sonner";
import {
  LocationAutocomplete,
  type LocationData
} from "../welcome/LocationAutocomplete";
import { updateUserLocation } from "@web/src/server/actions/db/userAdditional";
import { formatLocationForStorage } from "@web/src/lib/location";

interface AccountTabProps {
  userId: string;
  userEmail: string;
  location: string | null;
  googleMapsApiKey: string;
  onDirtyChange?: (dirty: boolean) => void;
  onRegisterSave?: (save: () => Promise<void>) => void;
}

export function AccountTab({
  userId,
  userEmail,
  location,
  googleMapsApiKey,
  onDirtyChange,
  onRegisterSave
}: AccountTabProps) {
  const app = useStackApp();
  const user = useUser();
  const isGoogleUser =
    user?.oauthProviders?.some((provider) => provider.id === "google") ?? false;
  const authLabel = isGoogleUser ? "Google" : "Email & Password";
  const displayedEmail = user?.primaryEmail ?? userEmail;
  const [isSendingReset, setIsSendingReset] = React.useState(false);
  const [locationValue, setLocationValue] = React.useState<LocationData | null>(
    null
  );
  const [isSavingLocation, setIsSavingLocation] = React.useState(false);
  const [savedLocation, setSavedLocation] = React.useState(location ?? "");

  const handlePasswordReset = async () => {
    if (!displayedEmail) {
      toast.error("No email found for your account.");
      return;
    }

    setIsSendingReset(true);
    try {
      const callbackUrl = `${window.location.origin}/reset-password`;
      const result = await app.sendForgotPasswordEmail(displayedEmail, {
        callbackUrl
      });

      if (result.status === "error") {
        toast.error("Failed to send password reset email.");
        return;
      }

      toast.success("Password reset email sent.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to send reset email.");
    } finally {
      setIsSendingReset(false);
    }
  };

  const locationDraft = React.useMemo(() => {
    return locationValue ? formatLocationForStorage(locationValue) : "";
  }, [locationValue]);

  const isLocationDirty = React.useMemo(() => {
    return Boolean(locationValue) && locationDraft !== savedLocation;
  }, [locationDraft, locationValue, savedLocation]);

  React.useEffect(() => {
    if (locationValue) {
      return;
    }
    setSavedLocation(location ?? "");
  }, [location, locationValue]);

  const handleLocationChange = (nextLocation: LocationData | null) => {
    setLocationValue(nextLocation);
  };

  const handleSaveLocation = React.useCallback(async () => {
    if (!locationValue) {
      return;
    }
    const formattedLocation = formatLocationForStorage(locationValue);
    setIsSavingLocation(true);
    try {
      await updateUserLocation(userId, formattedLocation);
      setSavedLocation(formattedLocation);
      toast.success("Location updated.");
    } catch (error) {
      toast.error((error as Error).message || "Failed to update location.");
    } finally {
      setIsSavingLocation(false);
    }
  }, [locationValue, userId]);

  React.useEffect(() => {
    onDirtyChange?.(isLocationDirty);
  }, [isLocationDirty, onDirtyChange]);

  React.useEffect(() => {
    onRegisterSave?.(handleSaveLocation);
  }, [handleSaveLocation, onRegisterSave]);

  return (
    <div className="grid gap-6">
      {/* Authentication */}
      <Card id="account">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Account Details</CardTitle>
          </div>
          <CardDescription>
            Manage your login credentials and authentication method
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label>Authentication Type</Label>
            <div className="flex items-center">
              <Badge variant="outline" className="py-2 px-3 gap-2 text-sm">
                {isGoogleUser && (
                  <LoadingImage
                    src="/logo-google.png"
                    alt="Google"
                    width={16}
                    height={16}
                  />
                )}
                {authLabel}
              </Badge>
            </div>
          </div>

          {!isGoogleUser && (
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
                  value={displayedEmail}
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
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 cursor-pointer"
                  onClick={handlePasswordReset}
                  disabled={isSendingReset}
                >
                  {isSendingReset ? "Sending email..." : "Change password"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle>Location</CardTitle>
          </div>
          <CardDescription>
            Your service area for market insights and content generation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="location">Service Area</Label>
            <LocationAutocomplete
              value={locationValue}
              onChange={handleLocationChange}
              apiKey={googleMapsApiKey}
              initialValue={savedLocation}
              placeholder="Enter your ZIP code"
              className={isSavingLocation ? "opacity-70" : undefined}
            />
            <p className="text-sm text-muted-foreground">
              Update by entering your ZIP code.
            </p>
            {isLocationDirty && (
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveLocation}
                  disabled={isSavingLocation}
                >
                  {isSavingLocation ? "Saving..." : "Save Location"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
