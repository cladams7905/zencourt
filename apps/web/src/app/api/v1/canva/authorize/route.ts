import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getCanvaAuthConfig } from "../_config";

function createBase64Url(value: Buffer) {
  return value
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function createCodeVerifier() {
  return createBase64Url(crypto.randomBytes(96));
}

function createCodeChallenge(codeVerifier: string) {
  return createBase64Url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
}

function createState() {
  return createBase64Url(crypto.randomBytes(96));
}

export async function GET(request: NextRequest) {
  const { clientId, scopes, redirectUri, authorizeUrl } =
    getCanvaAuthConfig(request.url);
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const state = createState();

  const authUrl = new URL(authorizeUrl);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("scope", scopes);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("redirect_uri", redirectUri);

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("canva_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/"
  });
  response.cookies.set("canva_oauth_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 10 * 60,
    path: "/"
  });

  return response;
}
