import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { deleteMemoryCardForUser, updateMemoryCardForUser } from "@/lib/database";
import { removePrivateMedia } from "@/lib/media";
import { memoryCardUpdateSchema } from "@/lib/validation";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { id } = await params;
  const parsed = memoryCardUpdateSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const card = updateMemoryCardForUser(id, user.id, parsed.data);
  if (!card) return NextResponse.json({ error: "找不到这段记忆。" }, { status: 404 });
  return NextResponse.json({ card });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { id } = await params;
  const deleted = deleteMemoryCardForUser(id, user.id);
  if (!deleted) return NextResponse.json({ error: "找不到这段记忆。" }, { status: 404 });
  const results = await Promise.allSettled(deleted.storageKeys.map((storageKey) => removePrivateMedia(storageKey)));
  const failed = results.filter((result) => result.status === "rejected").length;
  return NextResponse.json({ deleted: true, mediaCleanupPending: failed });
}
