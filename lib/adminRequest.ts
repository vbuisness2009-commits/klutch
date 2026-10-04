import "server-only";

import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifyAdminSession } from "./adminAuth";

/** True when the current request carries a valid admin session cookie. */
export async function isAdminRequest(): Promise<boolean> {
  return Boolean(await verifyAdminSession(cookies().get(ADMIN_COOKIE)?.value));
}
