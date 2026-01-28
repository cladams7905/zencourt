"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, type CurrentUser } from "@stackframe/stack";
import { AuthView } from "@web/src/components/auth/AuthView";
import { Button } from "@web/src/components/ui/button";
import { toast } from "sonner";
import Link from "next/link";
import { Mail, RefreshCw, Loader2 } from "lucide-react";

function CheckInboxContent({ user }: { user: CurrentUser }) {
  const router = useRouter();
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const contactChannels = user.useContactChannels();
  const primaryEmailChannel = contactChannels.find(
    (c) => c.isPrimary && c.type === "email"
  );

  // Redirect to welcome if user is already verified
  useEffect(() => {
    if (user.primaryEmailVerified) {
      router.replace("/welcome");
    }
  }, [user.primaryEmailVerified, router]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      );
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (!primaryEmailChannel || isResending || resendCooldown > 0) return;

    setIsResending(true);
    try {
      await primaryEmailChannel.sendVerificationEmail();
      toast.success("Verification email sent!", {
        description: "Check your inbox for the new verification link."
      });
      setResendCooldown(60); // 60 second cooldown
    } catch {
      toast.error("Failed to resend email", {
        description: "Please try again in a moment."
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthView>
      <div className="w-full space-y-6 text-center">
        <div className="mx-auto w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center">
          <Mail className="h-8 w-8 text-foreground" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-header font-semibold text-foreground">
            Check your inbox
          </h1>
          <p className="text-sm text-muted-foreground">
            We sent a verification link to
          </p>
          <p className="text-sm font-medium text-foreground">
            {user.primaryEmail}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 pt-2">
          <Button
            onClick={handleResend}
            variant="default"
            className="w-full"
            disabled={isResending || resendCooldown > 0 || !primaryEmailChannel}
          >
            {isResending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Resend verification email
              </>
            )}
          </Button>

          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              await user.signOut();
              router.push("/handler/sign-up");
            }}
          >
            Use a different email
          </Button>
        </div>
      </div>
    </AuthView>
  );
}

export default function CheckInboxPage() {
  const user = useUser();

  // Show loading state while checking user
  if (user === undefined) {
    return (
      <AuthView>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AuthView>
    );
  }

  // If no user, show sign-in prompt
  if (!user) {
    return (
      <AuthView>
        <div className="space-y-4 text-center">
          <h1 className="text-2xl font-header font-semibold text-foreground">
            Session expired
          </h1>
          <p className="text-sm text-muted-foreground">
            Please sign in again to continue.
          </p>
          <Button asChild className="w-full">
            <Link href="/handler/sign-in">Sign in</Link>
          </Button>
        </div>
      </AuthView>
    );
  }

  return <CheckInboxContent user={user} />;
}
