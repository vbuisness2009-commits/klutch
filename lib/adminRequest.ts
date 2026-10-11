import "server-only";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, isAdminEmail, verifyAdminSession } from "./adminAuth";
import { currentUser } from "./userSession";

/** True when the current request carries a valid admin session cookie or logged-in admin user. */
export async function isAdminRequest(): Promise<boolean> {
  const cookieVal = cookies().get(ADMIN_COOKIE)?.value;
  if (cookieVal && (await verifyAdminSession(cookieVal))) {
    return true;
  }
  const user = await currentUser();
  if (user && isAdminEmail(user.email)) {
    return true;
  }
  return false;
}
