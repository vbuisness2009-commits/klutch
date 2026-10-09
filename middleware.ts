import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { ADMIN_COOKIE, verifyAdminSession } from "@/lib/adminAuth";
import { USER_COOKIE, verifyUserSession } from "@/lib/userAuth";

/**
 * Platform Access Control:
 * 1. Admin hub (/admin, /api/admin) is hidden behind ADMIN_EMAIL stealth 404s.
 * 2. Unauthenticated visitors are restricted strictly to the landing page (/).
 *    Visiting any protected page (/sat, /ap, /practice, /dashboard, etc.) redirects
 *    to /signup?next=... to require an account.
 * 3. Static assets, auth endpoints, and robots/sitemaps remain public.
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // 1. Static assets and internal routes are always allowed
  if (
    path.startsWith("/_next") ||
    path === "/favicon.ico" ||
    path === "/favicon.svg" ||
    path === "/icon.svg" ||
    path === "/robots.txt" ||
    path === "/sitemap.xml" ||
    path.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i)
  ) {
    return NextResponse.next();
  }

  // 2. Public auth endpoints
  if (path.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // 3. Admin login pages are public (for the operator to log in)
  const isAdminLogin = path === "/admin/login" || path === "/api/admin/login";
  if (isAdminLogin) {
    const res = NextResponse.next();
    res.headers.set("x-robots-tag", "noindex, nofollow");
    return res;
  }

  // Check admin session
  const adminToken = req.cookies.get(ADMIN_COOKIE)?.value;
  const adminSession = await verifyAdminSession(adminToken);

  // 4. Admin hub stealth 404 gate
  const isAdminPage = path === "/admin" || path.startsWith("/admin/");
  const isAdminApi = path.startsWith("/api/admin");
  if (isAdminPage || isAdminApi) {
    if (!adminSession) {
      if (isAdminApi) {
        return NextResponse.json({ error: "Not found." }, { status: 404 });
      }
      return NextResponse.rewrite(new URL("/__not-found", req.url), {
        status: 404,
      });
    }
    return NextResponse.next();
  }

  // 5. Public landing, login, and signup pages
  if (path === "/" || path === "/login" || path === "/signup") {
    return NextResponse.next();
  }

  // 6. Check student / user session (operator admin session also grants access)
  const userToken = req.cookies.get(USER_COOKIE)?.value;
  const userUid = await verifyUserSession(userToken);
  const isAuthenticated = Boolean(userUid || adminSession);

  if (!isAuthenticated) {
    // Protected API routes return 401 Unauthorized
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Protected pages redirect to signup with return URL
    const destination = req.nextUrl.search
      ? `${path}${req.nextUrl.search}`
      : path;
    const signupUrl = new URL("/signup", req.url);
    signupUrl.searchParams.set("next", destination);
    return NextResponse.redirect(signupUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
