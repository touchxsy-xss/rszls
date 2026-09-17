import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, USER_SESSION_COOKIE, verifySession } from "@/lib/auth";
import { findUserById } from "@/lib/database";

export async function requireCurrentUser() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/welcome");
  return user;
}

export async function getAuthenticatedUser() {
  const token = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session || session.scope !== "user") return null;
  const user = findUserById(session.subject);
  return user?.consent_at ? user : null;
}

export async function requireAdmin() {
  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session || session.scope !== "admin") redirect("/admin/login");
  return session;
}
