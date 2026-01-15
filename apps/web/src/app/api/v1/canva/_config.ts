interface CanvaAuthConfig {
  clientId: string;
  clientSecret: string;
  scopes: string;
  redirectUri: string;
  tokenUrl: string;
  authorizeUrl: string;
}

export function getCanvaAuthConfig(requestUrl: string): CanvaAuthConfig {
  const clientId = process.env.CANVA_CLIENT_ID?.trim();
  const clientSecret = process.env.CANVA_CLIENT_SECRET?.trim();
  const scopes = process.env.CANVA_SCOPES?.trim();
  const redirectUri =
    process.env.CANVA_REDIRECT_URI?.trim() ??
    new URL("/canva/redirect", requestUrl).toString();
  const tokenUrl =
    process.env.CANVA_TOKEN_URL?.trim() ??
    "https://www.canva.com/api/oauth/token";
  const authorizeUrl =
    process.env.CANVA_AUTHORIZE_URL?.trim() ??
    "https://www.canva.com/api/oauth/authorize";

  if (!clientId || !clientSecret || !scopes) {
    throw new Error(
      "CANVA_CLIENT_ID, CANVA_CLIENT_SECRET, and CANVA_SCOPES must be configured"
    );
  }

  return {
    clientId,
    clientSecret,
    scopes,
    redirectUri,
    tokenUrl,
    authorizeUrl
  };
}
