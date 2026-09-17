import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/current-user";
import { createAdminMemoryUnitRevision, findAdminRecord } from "@/lib/database";
import { adminMemoryUnitUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!findAdminRecord(id)) return NextResponse.json({ error: "找不到这条原始记录。" }, { status: 404 });
  const parsed = adminMemoryUnitUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "记忆单元格式不正确。" }, { status: 400 });
  const memoryUnit = createAdminMemoryUnitRevision({ responseId: id, payload: parsed.data, actorId: admin.subject });
  return NextResponse.json({ memoryUnit });
}
