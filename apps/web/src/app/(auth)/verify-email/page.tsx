"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useStackApp } from "@stackframe/stack";
import { AuthView } from "@web/src/components/auth/AuthView";
import { Button } from "@web/src/components/ui/button";
import Link from "next/link";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function VerifyEmailPage() {
  const stackApp = useStackApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!code) {
      setStatus("error");
      setErrorMessage(
        "No verification code found. Please check your email link."
      );
      return;
    }

    let cancelled = false;

    async function verify() {
      const result = await stackApp.verifyEmail(code!);

      if (cancelled) return;

      if (result.status === "error") {
        setStatus("error");
        setErrorMessage(
          "This verification link is invalid or has expired. Please request a new one."
        );
      } else {
        setStatus("success");
        // Brief delay so user sees success, then redirect
        setTimeout(() => {
          if (!cancelled) {
            router.replace("/welcome");
          }
        }, 1500);
      }
    }

    verify();

    return () => {
      cancelled = true;
    };
  }, [code, stackApp, router]);

  return (
    <AuthView>
      <div className="w-full space-y-6 text-center">
        {status === "verifying" && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-accent/50 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-header font-semibold text-foreground">
                Verifying your email
              </h1>
              <p className="text-sm text-muted-foreground">Just a moment...</p>
            </div>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-primary-foreground" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-header font-semibold text-foreground">
                Email verified
              </h1>
              <p className="text-sm text-muted-foreground">
                Redirecting you to get started...
              </p>
            </div>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-header font-semibold text-foreground">
                Verification failed
              </h1>
              <p className="text-sm text-muted-foreground">{errorMessage}</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/check-inbox">Back to check inbox</Link>
            </Button>
          </>
        )}
      </div>
    </AuthView>
  );
}
