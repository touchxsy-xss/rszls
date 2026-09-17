import { NextResponse } from "next/server";
import { ADMIN_SESSION_COOKIE, createSession, verifyAdminPassword } from "@/lib/auth";
import { adminLoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const parsed = adminLoginSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "请输入管理员密码。" }, { status: 400 });
  if (!verifyAdminPassword(parsed.data.password)) return NextResponse.json({ error: "管理员密码不正确。" }, { status: 401 });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, createSession("admin", "environment-admin"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return response;
}
