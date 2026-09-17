import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { findAdminRecord, updateAdminFollowup } from "@/lib/database";
import { adminFollowupUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!findAdminRecord(id)) return NextResponse.json({ error: "找不到这条原始记录。" }, { status: 404 });
  const parsed = adminFollowupUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "追问格式不正确。" }, { status: 400 });
  const followup = updateAdminFollowup({ responseId: id, ...parsed.data, actorId: admin.subject });
  return NextResponse.json({ followup });
}
