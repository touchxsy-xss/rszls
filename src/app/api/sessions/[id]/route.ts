import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { getSessionMaterials } from "@/lib/database";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { id } = await params;
  const materials = getSessionMaterials(id, user.id);
  if (!materials) return NextResponse.json({ error: "找不到这次记录。" }, { status: 404 });
  return NextResponse.json(materials);
}
