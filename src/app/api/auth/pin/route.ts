import { NextResponse } from "next/server";
import { createSession, hashPin, USER_SESSION_COOKIE, verifyPin } from "@/lib/auth";
import { configureUser, findUserByInvite } from "@/lib/database";
import { pinSchema } from "@/lib/validation";

const cookieOptions = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/", maxAge: 14 * 24 * 60 * 60 };

export async function POST(request: Request) {
  const parsed = pinSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

  const data = parsed.data;
  const user = findUserByInvite(data.inviteCode);
  if (!user) return NextResponse.json({ error: "邀请码不存在。" }, { status: 404 });

  if (data.mode === "set") {
    if (user.pin_hash) return NextResponse.json({ error: "该邀请码已设置 PIN，请直接登录。" }, { status: 409 });
    if (!data.consent || !data.displayName) return NextResponse.json({ error: "请确认授权并填写怎么称呼你。" }, { status: 400 });
    configureUser(user, { pinHash: await hashPin(data.pin), displayName: data.displayName, birthYear: data.birthYear ?? null, city: data.city ?? null });
  } else if (!user.pin_hash || !(await verifyPin(data.pin, user.pin_hash))) {
    return NextResponse.json({ error: "邀请码或 PIN 不正确。" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(USER_SESSION_COOKIE, createSession("user", user.id), cookieOptions);
  return response;
}
