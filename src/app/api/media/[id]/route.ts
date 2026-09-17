import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireAdmin } from "@/lib/current-user";
import { deleteMediaAssetForUser, findMediaById, findMediaForUser, recordAdminAudit } from "@/lib/database";
import { readPrivateMedia, removePrivateMedia } from "@/lib/media";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthenticatedUser();
  let asset = user ? findMediaForUser(id, user.id) : undefined;
  if (!asset) {
    try {
      const admin = await requireAdmin();
      asset = findMediaById(id);
      if (asset) recordAdminAudit({ actorId: admin.subject, action: "ADMIN_MEDIA_VIEWED", metadata: { mediaId: id } });
    } catch {
      return NextResponse.json({ error: "未登录。" }, { status: 401 });
    }
  }
  if (!asset) return NextResponse.json({ error: "找不到媒体。" }, { status: 404 });
  try {
    const media = await readPrivateMedia(asset.storage_key);
    const body = media.buffer.slice(media.byteOffset, media.byteOffset + media.byteLength) as ArrayBuffer;
    return new NextResponse(body, { headers: { "content-type": asset.mime_type, "content-length": String(asset.file_size), "cache-control": "private, no-store", "content-disposition": `inline; filename="${encodeURIComponent(asset.original_file_name)}"` } });
  } catch {
    return NextResponse.json({ error: "媒体文件暂时不可用。" }, { status: 404 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { id } = await params;
  const asset = findMediaForUser(id, user.id);
  if (!asset) return NextResponse.json({ error: "找不到这个文件。" }, { status: 404 });
  await removePrivateMedia(asset.storage_key);
  deleteMediaAssetForUser(id, user.id);
  return NextResponse.json({ ok: true });
}
