import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { createSession, findPromptByDay } from "@/lib/database";
import { createSessionSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const parsed = createSessionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "无法创建这次记录。" }, { status: 400 });

  const mode = parsed.data.mode;
  const prompt = mode === "DAILY" ? findPromptByDay(user.experiment_day) : undefined;
  if (mode === "DAILY" && !prompt) return NextResponse.json({ error: "今日入口尚未配置。" }, { status: 404 });
  const session = createSession({ id: randomUUID(), userId: user.id, promptId: prompt?.id ?? null, mode });
  return NextResponse.json({ id: session.id });
}
