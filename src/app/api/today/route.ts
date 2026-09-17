import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { USER_SESSION_COOKIE, verifySession } from "@/lib/auth";
import { findPromptByDay, findUserById } from "@/lib/database";

export async function GET() {
  const token = (await cookies()).get(USER_SESSION_COOKIE)?.value;
  const session = verifySession(token);
  if (!session || session.scope !== "user") return NextResponse.json({ error: "未登录。" }, { status: 401 });

  const user = findUserById(session.subject);
  if (!user || !user.consent_at) return NextResponse.json({ error: "尚未完成授权。" }, { status: 403 });
  const prompt = findPromptByDay(user.experiment_day);
  if (!prompt) return NextResponse.json({ error: "今日入口尚未配置。" }, { status: 404 });

  return NextResponse.json({ day: user.experiment_day, displayName: user.display_name, prompt });
}
