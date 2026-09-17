import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { listSelectedMemoryCardsForDay7, recordAnalyticsEvent, saveDay7Work } from "@/lib/database";
import { day7WorkSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const parsed = day7WorkSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "作品内容不完整。" }, { status: 400 });
  const cards = listSelectedMemoryCardsForDay7(user.id, parsed.data.cardIds);
  if (cards.length !== parsed.data.cardIds.length) return NextResponse.json({ error: "只能选择已确认且允许进入作品的记忆。" }, { status: 400 });
  const work = saveDay7Work({ userId: user.id, ...parsed.data });
  recordAnalyticsEvent({ id: randomUUID(), userId: user.id, sessionId: null, eventName: "DAY7_WORK_SAVED", metadata: { cardCount: cards.length } });
  return NextResponse.json({ work });
}
