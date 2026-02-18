import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { TargetAudience } from "@db/client";
import type { BrandingTabProps } from "@web/src/components/settings/shared";
import { updateTargetAudiences } from "@web/src/server/actions/db/userAdditional";

interface UseBrandingAudienceSettingsArgs {
  userId: string;
  userAdditional: BrandingTabProps["userAdditional"];
}

const normalizeText = (value: string | null | undefined) => (value ?? "").trim();

export const useBrandingAudienceSettings = ({
  userId,
  userAdditional
}: UseBrandingAudienceSettingsArgs) => {
  const router = useRouter();
  const [isLoadingAudiences, setIsLoadingAudiences] = React.useState(false);
  const [targetAudiences, setTargetAudiences] = React.useState<TargetAudience[]>(
    () => userAdditional.targetAudiences ?? []
  );
  const [initialTargetAudiences, setInitialTargetAudiences] = React.useState<
    TargetAudience[]
  >(() => userAdditional.targetAudiences ?? []);
  const [audienceDescription, setAudienceDescription] = React.useState(
    userAdditional.audienceDescription || ""
  );
  const [initialAudienceDescription, setInitialAudienceDescription] =
    React.useState(userAdditional.audienceDescription || "");

  const toggleTargetAudience = (audience: TargetAudience) => {
    setTargetAudiences((prev) => {
      if (prev.includes(audience)) {
        return prev.filter((a) => a !== audience);
      }
      if (prev.length >= 2) {
        return prev;
      }
      return [...prev, audience];
    });
  };

  const isTargetAudiencesDirty = React.useMemo(() => {
    const initial = [...initialTargetAudiences].sort();
    const current = [...targetAudiences].sort();
    if (initial.length !== current.length) {
      return true;
    }
    if (initial.some((value, index) => value !== current[index])) {
      return true;
    }
    return (
      normalizeText(audienceDescription) !==
      normalizeText(initialAudienceDescription)
    );
  }, [
    initialTargetAudiences,
    targetAudiences,
    audienceDescription,
    initialAudienceDescription
  ]);

  const handleSaveTargetAudiences = React.useCallback(async () => {
    setIsLoadingAudiences(true);
    try {
      const trimmedAudienceDescription = audienceDescription.trim();
      const record = await updateTargetAudiences(
        userId,
        targetAudiences,
        trimmedAudienceDescription || null
      );
      if (record?.audienceDescription !== undefined) {
        setAudienceDescription(record.audienceDescription || "");
      } else {
        setAudienceDescription(trimmedAudienceDescription);
      }
      setInitialTargetAudiences([...targetAudiences]);
      if (record?.audienceDescription !== undefined) {
        setInitialAudienceDescription(record.audienceDescription || "");
      } else {
        setInitialAudienceDescription(trimmedAudienceDescription);
      }
      toast.success("Target audiences updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error(
        (error as Error).message || "Failed to update target audiences"
      );
    } finally {
      setIsLoadingAudiences(false);
    }
  }, [audienceDescription, router, targetAudiences, userId]);

  return {
    targetAudiences,
    audienceDescription,
    setAudienceDescription,
    toggleTargetAudience,
    isTargetAudiencesDirty,
    isLoadingAudiences,
    handleSaveTargetAudiences
  };
};
