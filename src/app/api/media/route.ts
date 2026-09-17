import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { createMediaAsset, findSessionForUser, getOrCreateDraftResponse } from "@/lib/database";
import { MediaKind, storePrivateMedia, validateMediaFile } from "@/lib/media";

const kinds = new Set<MediaKind>(["AUDIO", "IMAGE", "VIDEO"]);

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const form = await request.formData();
  const sessionId = form.get("sessionId");
  const kind = form.get("kind");
  const file = form.get("file");
  const duration = form.get("durationSeconds");
  if (typeof sessionId !== "string" || typeof kind !== "string" || !kinds.has(kind as MediaKind) || !(file instanceof File)) return NextResponse.json({ error: "上传内容不完整。" }, { status: 400 });
  const session = findSessionForUser(sessionId, user.id);
  if (!session || session.status !== "OPEN") return NextResponse.json({ error: "这次记录无法修改。" }, { status: 404 });
  const fileError = validateMediaFile(kind as MediaKind, file);
  if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

  const response = getOrCreateDraftResponse(session.id);
  const storageKey = await storePrivateMedia(user.id, file);
  const asset = createMediaAsset({
    id: randomUUID(), response_id: response.id, user_id: user.id, type: kind as MediaKind, storage_key: storageKey,
    original_file_name: file.name || "untitled", mime_type: file.type, file_size: file.size,
    duration_seconds: typeof duration === "string" && Number.isFinite(Number(duration)) ? Number(duration) : null,
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ asset });
}
