import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { findSessionForUser, getOrCreateDraftResponse, saveResponseText } from "@/lib/database";
import { responseTextSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const parsed = responseTextSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const session = findSessionForUser(parsed.data.sessionId, user.id);
  if (!session || session.status !== "OPEN") return NextResponse.json({ error: "这次记录无法修改。" }, { status: 404 });
  const response = getOrCreateDraftResponse(session.id);
  return NextResponse.json({ response: saveResponseText(response.id, parsed.data.text) });
}
