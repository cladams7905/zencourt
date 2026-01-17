import * as React from "react";
import { PasswordReset } from "@stackframe/stack";
import { AuthView } from "@web/src/components/AuthView";

interface ResetPasswordPageProps {
  searchParams: Promise<{
    code?: string;
    verification_code?: string;
    verificationCode?: string;
    token?: string;
    reset_code?: string;
    callbackUrl?: string;
  }>;
}

export default function ResetPasswordPage({
  searchParams
}: ResetPasswordPageProps) {
  const resolvedSearchParams = React.use(searchParams);
  const coerceParam = (value?: string | string[]) =>
    Array.isArray(value) ? value[0] : value;

  const getCodeFromCallback = (value?: string | string[]) => {
    const callbackUrl = coerceParam(value);
    if (!callbackUrl) {
      return undefined;
    }

    try {
      const url = new URL(callbackUrl);
      return (
        url.searchParams.get("code") ??
        url.searchParams.get("verification_code") ??
        url.searchParams.get("verificationCode") ??
        url.searchParams.get("token") ??
        url.searchParams.get("reset_code") ??
        undefined
      );
    } catch {
      return undefined;
    }
  };

  const code =
    coerceParam(resolvedSearchParams.code) ??
    coerceParam(resolvedSearchParams.verification_code) ??
    coerceParam(resolvedSearchParams.verificationCode) ??
    coerceParam(resolvedSearchParams.token) ??
    coerceParam(resolvedSearchParams.reset_code) ??
    getCodeFromCallback(resolvedSearchParams.callbackUrl) ??
    "";

  return (
    <AuthView>
      <PasswordReset searchParams={{ code }} fullPage={false} />
    </AuthView>
  );
}
