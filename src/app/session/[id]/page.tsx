import { notFound } from "next/navigation";
import { SessionEditor } from "@/components/session-editor";
import { requireCurrentUser } from "@/lib/current-user";
import { findPromptByDay, getSessionMaterials } from "@/lib/database";
import { getAudioDurationLimitSeconds } from "@/lib/media";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const materials = getSessionMaterials(id, user.id);
  if (!materials) notFound();
  const prompt = materials.session.mode === "DAILY" ? findPromptByDay(user.experiment_day) : undefined;
  const heading = materials.session.mode === "FREE" ? "说一件你今天忽然想起的事。" : prompt?.prompt_text ?? "说说你想留下的事。";
  const initialAssets = materials.media.map((asset) => ({
    id: asset.id,
    type: asset.type,
    original_file_name: asset.original_file_name,
    mime_type: asset.mime_type,
    file_size: asset.file_size,
    duration_seconds: asset.duration_seconds,
  }));
  const memoryUnit = materials.memoryUnit ? JSON.parse(materials.memoryUnit.payload_json) as Record<string, unknown> : null;
  const followup = materials.followup ? { id: materials.followup.id, question: materials.followup.question, status: materials.followup.status } : null;
  return <SessionEditor sessionId={id} responseId={materials.response?.id ?? null} heading={heading} initialText={materials.response?.text_input ?? ""} initialAssets={initialAssets} initialStatus={materials.session.status} initialProcessingStatus={materials.response?.processing_status ?? "RAW"} initialMemoryUnit={memoryUnit} initialMemoryCardId={materials.memoryCard?.id ?? null} initialFollowup={followup} maxDuration={getAudioDurationLimitSeconds()} />;
}
