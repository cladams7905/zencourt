import { NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const allowedPathPrefixes = ["/handler", "/api/v1/webhooks", "/_next"];
  const allowedExactPaths = [
    "/",
    "/_not-found",
    "/terms",
    "/privacy",
    "/check-inbox",
    "/verify-email"
  ];

  const hasStackSession =
    Boolean(request.cookies.get("stack-access")?.value) ||
    Boolean(request.cookies.get("stack-refresh")?.value);

  // Allow requests that should bypass auth entirely (including root page for landing)
  if (
    allowedExactPaths.includes(pathname) ||
    allowedPathPrefixes.some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }

  if (!hasStackSession) {
    return NextResponse.redirect(new URL("/handler/sign-in", request.url));
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
