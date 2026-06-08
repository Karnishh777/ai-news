import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/jwt";

const PUBLIC_PATHS = ["/login", "/signup", "/verify", "/forgot-password"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = await verifySession(token);

  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const isRoot = pathname === "/";

  // Signed-in users shouldn't see auth pages or the marketing root.
  if (session && (isPublic || isRoot)) {
    return NextResponse.redirect(new URL("/feed", req.url));
  }

  // Guests can only see public auth pages and the root landing.
  if (!session && !isPublic && !isRoot) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Admin area requires the admin role.
  if (pathname.startsWith("/admin") && session?.role !== "admin") {
    return NextResponse.redirect(new URL("/feed", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except API routes, Next internals, and static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
