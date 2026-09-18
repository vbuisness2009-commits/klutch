import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optional lock on the admin surface for public deploys.
 * Set ADMIN_SECRET in the environment; visitors must send
 *   ?key=SECRET  or  header x-admin-key: SECRET
 * Practice / player routes stay open.
 */
export function middleware(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return NextResponse.next();

  const path = req.nextUrl.pathname;
  if (!path.startsWith("/admin") && !path.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const key =
    req.nextUrl.searchParams.get("key") ||
    req.headers.get("x-admin-key") ||
    "";

  if (key === secret) return NextResponse.next();

  return NextResponse.json(
    { error: "Admin locked. Pass ?key=… or x-admin-key." },
    { status: 401 }
  );
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
