import * as React from "react";
import { PasswordReset } from "@stackframe/stack";
import { AuthView } from "@web/src/components/auth/AuthView";
import { resolveResetPasswordCode } from "@web/src/app/(auth)/reset-password/resetPasswordCode";

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
  const code = resolveResetPasswordCode(resolvedSearchParams);

  return (
    <AuthView>
      <PasswordReset searchParams={{ code }} fullPage={false} />
    </AuthView>
  );
}
