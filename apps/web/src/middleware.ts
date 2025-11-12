import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isHandlerPage = request.nextUrl.pathname.startsWith("/handler");
  const isWebhook = request.nextUrl.pathname.startsWith("/api/v1/webhooks");
  const isNotFound = request.nextUrl.pathname === "/_not-found";
  const isNextInternal = request.nextUrl.pathname.startsWith("/_next");
  const hasStackSession =
    Boolean(request.cookies.get("stack-access")?.value) ||
    Boolean(request.cookies.get("stack-refresh")?.value);

  // Allow auth, handler, webhook, and Next.js internal pages without authentication check
  if (isAuthPage || isHandlerPage || isWebhook || isNotFound || isNextInternal) {
    // If already authenticated and trying to access /auth, redirect to home
    if (isAuthPage && hasStackSession) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Check authentication for all other pages using Stack session cookies
  if (!hasStackSession) {
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
