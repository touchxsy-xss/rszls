import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { overrideDailyPrompt } from "@/lib/database";
import { adminPromptOverrideSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const parsed = adminPromptOverrideSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "问题格式不正确。" }, { status: 400 });
  const prompt = overrideDailyPrompt({ ...parsed.data, actorId: admin.subject });
  return NextResponse.json({ prompt });
}
