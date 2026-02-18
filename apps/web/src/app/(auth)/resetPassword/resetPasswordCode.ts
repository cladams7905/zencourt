type ResetPasswordSearchParams = {
  code?: string;
  verification_code?: string;
  verificationCode?: string;
  token?: string;
  reset_code?: string;
  callbackUrl?: string;
};

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

export function resolveResetPasswordCode(params: ResetPasswordSearchParams): string {
  return (
    coerceParam(params.code) ??
    coerceParam(params.verification_code) ??
    coerceParam(params.verificationCode) ??
    coerceParam(params.token) ??
    coerceParam(params.reset_code) ??
    getCodeFromCallback(params.callbackUrl) ??
    ""
  );
}

