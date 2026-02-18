"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { BrandingTabProps } from "@web/src/components/settings/shared";
import {
  coerceToneValue,
  TONE_SCALE
} from "@web/src/components/settings/shared";
import {
  markWritingStyleCompleted,
  updateWritingStyle
} from "@web/src/server/actions/db/userAdditional";

interface UseBrandingWritingStyleSettingsArgs {
  userId: string;
  userAdditional: BrandingTabProps["userAdditional"];
  isActive: boolean;
}

export const useBrandingWritingStyleSettings = ({
  userId,
  userAdditional,
  isActive
}: UseBrandingWritingStyleSettingsArgs) => {
  const router = useRouter();
  const [isLoadingStyle, setIsLoadingStyle] = React.useState(false);
  const [writingToneLevel, setWritingToneLevel] = React.useState<number>(
    coerceToneValue(userAdditional.writingToneLevel)
  );
  const [writingStyleCustom, setWritingStyleCustom] = React.useState(
    userAdditional.writingStyleCustom || ""
  );
  const [initialWritingStyle, setInitialWritingStyle] = React.useState(() => ({
    preset: coerceToneValue(userAdditional.writingToneLevel),
    custom: userAdditional.writingStyleCustom || ""
  }));
  const [hasMarkedWritingStyle, setHasMarkedWritingStyle] = React.useState(
    Boolean(userAdditional.writingStyleCompletedAt)
  );
  const writingStyleSentinelRef = React.useRef<HTMLDivElement | null>(null);

  const isWritingStyleDirty = React.useMemo(() => {
    if (initialWritingStyle.preset !== writingToneLevel) {
      return true;
    }
    if ((initialWritingStyle.custom || "") !== (writingStyleCustom || "")) {
      return true;
    }
    return false;
  }, [writingToneLevel, writingStyleCustom, initialWritingStyle]);

  const toneValue = React.useMemo(
    () => coerceToneValue(writingToneLevel),
    [writingToneLevel]
  );
  const toneMeta =
    TONE_SCALE.find((tone) => tone.value === toneValue) ?? TONE_SCALE[2];

  React.useEffect(() => {
    if (!isActive || hasMarkedWritingStyle) {
      return;
    }

    const sentinel = writingStyleSentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          return;
        }
        setHasMarkedWritingStyle(true);
        void markWritingStyleCompleted(userId);
        observer.disconnect();
      },
      { threshold: 0.2 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMarkedWritingStyle, isActive, userId]);

  const handleSaveWritingStyle = React.useCallback(async () => {
    setIsLoadingStyle(true);
    try {
      await updateWritingStyle(userId, {
        writingToneLevel: writingToneLevel ?? null,
        writingStyleCustom: writingStyleCustom || null
      });
      setInitialWritingStyle({
        preset: writingToneLevel,
        custom: writingStyleCustom || ""
      });
      toast.success("Writing style updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message || "Failed to update writing style");
    } finally {
      setIsLoadingStyle(false);
    }
  }, [router, userId, writingToneLevel, writingStyleCustom]);

  return {
    toneMeta,
    toneValue,
    setWritingToneLevel,
    writingStyleCustom,
    setWritingStyleCustom,
    isWritingStyleDirty,
    isLoadingStyle,
    handleSaveWritingStyle,
    writingStyleSentinelRef
  };
};
