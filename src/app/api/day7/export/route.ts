import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { findDay7WorkForUser, listConfirmedMemoryCardsForDay7, listSelectedMemoryCardsForDay7, recordAnalyticsEvent } from "@/lib/database";
import { buildDay7Draft, renderDay7Pdf } from "@/lib/day7";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const work = findDay7WorkForUser(user.id);
  const confirmed = listConfirmedMemoryCardsForDay7(user.id);
  const savedIds = work ? JSON.parse(work.card_ids_json) as string[] : confirmed.map((card) => card.id);
  const cards = work ? listSelectedMemoryCardsForDay7(user.id, savedIds) : confirmed;
  if (cards.length < 5 || cards.length > 7) return NextResponse.json({ error: "至少需要 5 段、最多 7 段已确认的记忆才能导出。" }, { status: 400 });
  const draft = work ? { title: work.title, intro: work.intro, closing: work.closing, cards } : buildDay7Draft(user.display_name, cards);
  const pdf = renderDay7Pdf(draft);
  recordAnalyticsEvent({ id: randomUUID(), userId: user.id, sessionId: null, eventName: "DAY7_PDF_EXPORTED", metadata: { cardCount: cards.length } });
  return new NextResponse(pdf, { status: 200, headers: { "content-type": "application/pdf", "content-disposition": "attachment; filename=day7-stories.pdf", "cache-control": "no-store" } });
}
