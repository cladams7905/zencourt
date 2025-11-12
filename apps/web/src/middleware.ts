import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isHandlerPage = pathname.startsWith("/handler");
  const isWebhook = pathname.startsWith("/api/v1/webhooks");
  const isNextInternal =
    pathname.startsWith("/_next") || pathname === "/_not-found";

  const hasStackSession =
    Boolean(request.cookies.get("stack-access")?.value) ||
    Boolean(request.cookies.get("stack-refresh")?.value);

  // Allow requests that should bypass auth entirely
  if (isHandlerPage || isWebhook || isNextInternal) {
    return NextResponse.next();
  }

  if (!hasStackSession) {
    const redirectUrl = new URL("/handler/sign-in", request.url);
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
