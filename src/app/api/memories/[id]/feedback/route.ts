import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { createMemoryCardFeedback, findMemoryCardForUser, recordAnalyticsEvent } from "@/lib/database";
import { memoryCardFeedbackSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { id } = await params;
  const parsed = memoryCardFeedbackSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "请选择一个反馈。" }, { status: 400 });
  const card = findMemoryCardForUser(id, user.id);
  if (!card) return NextResponse.json({ error: "找不到这段记忆。" }, { status: 404 });
  const feedback = createMemoryCardFeedback({ id: randomUUID(), cardId: card.id, rating: parsed.data.rating });
  recordAnalyticsEvent({ id: randomUUID(), userId: user.id, sessionId: null, eventName: "MEMORY_CARD_FEEDBACK", metadata: { memoryCardId: card.id, rating: feedback.rating } });
  return NextResponse.json({ feedback });
}
