import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { answerFollowup, createChildResponse, findFollowupForUser, findResponseForUser } from "@/lib/database";
import { followupAnswerSchema } from "@/lib/validation";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { id } = await params;
  const followup = findFollowupForUser(id, user.id);
  if (!followup || followup.status !== "PENDING") return NextResponse.json({ error: "这条追问已经处理过了。" }, { status: 404 });
  const parsed = followupAnswerSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const parent = findResponseForUser(followup.response_id, user.id);
  if (!parent) return NextResponse.json({ error: "找不到原始记录。" }, { status: 404 });
  const answer = createChildResponse(parent.session_id, parent.id, parsed.data.text);
  answerFollowup(id, answer.id);
  return NextResponse.json({ followup: { ...followup, status: "ANSWERED", answer_response_id: answer.id }, response: answer });
}
