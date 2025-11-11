import { stackServerApp } from "./server/lib/stack/server";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth");
  const isHandlerPage = request.nextUrl.pathname.startsWith("/handler");
  const isWebhook = request.nextUrl.pathname.startsWith("/api/v1/webhooks");

  // Allow auth, handler, and webhook pages without authentication check
  if (isAuthPage || isHandlerPage || isWebhook) {
    // Try to get user for auth page redirect logic
    try {
      const user = await stackServerApp.getUser();
      // If already authenticated and trying to access /auth, redirect to home
      if (isAuthPage && user) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch (error) {
      // Log error but don't block access to auth/handler/webhook pages
      console.error("Middleware: Error checking user authentication:", error);
    }
    return NextResponse.next();
  }

  // Check authentication for all other pages
  try {
    const user = await stackServerApp.getUser();

    if (!user) {
      const redirectUrl = new URL("/auth", request.url);
      redirectUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
      return NextResponse.redirect(redirectUrl);
    }
  } catch (error) {
    // Log error and redirect to auth page on authentication failure
    console.error("Middleware: Failed to verify user authentication:", error);
    const redirectUrl = new URL("/auth", request.url);
    redirectUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    redirectUrl.searchParams.set("error", "auth_check_failed");
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
