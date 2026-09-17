import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { getSessionMaterials, markSessionRawSaved } from "@/lib/database";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { id } = await params;
  const materials = getSessionMaterials(id, user.id);
  if (!materials) return NextResponse.json({ error: "找不到这次记录。" }, { status: 404 });
  if (!materials.response?.text_input && materials.media.length === 0) return NextResponse.json({ error: "请先留下文字、录音、照片或视频。" }, { status: 400 });
  return NextResponse.json({ session: markSessionRawSaved(id, user.id) });
}
