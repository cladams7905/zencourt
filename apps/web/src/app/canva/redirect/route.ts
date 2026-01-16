import { NextRequest, NextResponse } from "next/server";
import { getCanvaAuthConfig } from "../../api/v1/canva/_config";

function buildReturnUrl(
  requestUrl: string,
  params: { status: "success" | "error"; message?: string; state?: string }
) {
  const returnUrl = new URL("/canva/return", requestUrl);
  returnUrl.searchParams.set("status", params.status);

  if (params.message) {
    returnUrl.searchParams.set("message", params.message);
  }

  if (params.state) {
    returnUrl.searchParams.set("state", params.state);
  }

  return returnUrl;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const storedState = request.cookies.get("canva_oauth_state")?.value;
  const codeVerifier = request.cookies.get("canva_oauth_verifier")?.value;

  if (storedState && storedState !== state) {
    const redirectUrl = buildReturnUrl(request.url, {
      status: "error",
      message: "State mismatch. Please restart the Canva connection flow.",
      state: state ?? undefined
    });
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("canva_oauth_state");
    response.cookies.delete("canva_oauth_verifier");
    return response;
  }

  if (error || !code) {
    const message =
      errorDescription ||
      error ||
      "Missing authorization code from Canva.";
    const redirectUrl = buildReturnUrl(request.url, {
      status: "error",
      message,
      state: state ?? undefined
    });
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("canva_oauth_state");
    response.cookies.delete("canva_oauth_verifier");
    return response;
  }

  if (!codeVerifier) {
    const redirectUrl = buildReturnUrl(request.url, {
      status: "error",
      message: "Missing PKCE verifier. Please restart the Canva connection flow.",
      state: state ?? undefined
    });
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("canva_oauth_state");
    response.cookies.delete("canva_oauth_verifier");
    return response;
  }

  try {
    const { clientId, clientSecret, redirectUri, tokenUrl } =
      getCanvaAuthConfig(request.url);
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );
    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("code", code);
    body.set("code_verifier", codeVerifier);
    body.set("redirect_uri", redirectUri);

    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (!tokenResponse.ok) {
      const errorPayload = await tokenResponse.json().catch(() => ({}));
      const message =
        errorPayload?.error_description ||
        errorPayload?.error ||
        "Unable to exchange authorization code.";
      const redirectUrl = buildReturnUrl(request.url, {
        status: "error",
        message,
        state: state ?? undefined
      });
      const response = NextResponse.redirect(redirectUrl);
      response.cookies.delete("canva_oauth_state");
      response.cookies.delete("canva_oauth_verifier");
      return response;
    }

    await tokenResponse.json();

    const redirectUrl = buildReturnUrl(request.url, {
      status: "success",
      state: state ?? undefined
    });
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("canva_oauth_state");
    response.cookies.delete("canva_oauth_verifier");
    return response;
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Unexpected error while completing Canva authorization.";
    const redirectUrl = buildReturnUrl(request.url, {
      status: "error",
      message,
      state: state ?? undefined
    });
    const response = NextResponse.redirect(redirectUrl);
    response.cookies.delete("canva_oauth_state");
    response.cookies.delete("canva_oauth_verifier");
    return response;
  }
}
