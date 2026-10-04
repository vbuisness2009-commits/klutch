import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/adminAuth";

/**
 * /admin and /api/admin are only visible to the ADMIN_EMAIL session. Everyone
 * else gets a plain 404, so the hub doesn't advertise that it exists. The login
 * page and endpoint stay reachable by direct URL so a new device can sign in.
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const isAdminPage = path === "/admin" || path.startsWith("/admin/");
  const isAdminApi = path.startsWith("/api/admin");
  const isLogin =
    path === "/admin/login" || path === "/api/admin/login";

  if (!isAdminPage && !isAdminApi) return NextResponse.next();
  if (isLogin) {
    const res = NextResponse.next();
    res.headers.set("x-robots-tag", "noindex, nofollow");
    return res;
  }

  const token = req.cookies.get(ADMIN_COOKIE)?.value;
  const session = await verifyAdminSession(token);

  if (!session) {
    if (isAdminApi) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    // Any path outside the matcher with no page renders the site's 404.
    return NextResponse.rewrite(new URL("/__not-found", req.url), {
      status: 404,
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
