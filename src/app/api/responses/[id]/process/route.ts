import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/current-user";
import { getAIProvider, decideFollowup, type SourceMaterial } from "@/lib/ai";
import { findResponseForUser, listMediaForResponse, updateResponseProcessing, createMemoryUnit, createFollowup, createMemoryCard } from "@/lib/database";
import { readPrivateMedia } from "@/lib/media";
import { memoryUnitSchema } from "@/lib/validation";
import { buildMemoryCardDraft } from "@/lib/memory-cards";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "未登录。" }, { status: 401 });
  const { id } = await params;
  const response = findResponseForUser(id, user.id);
  if (!response) return NextResponse.json({ error: "找不到这条记录。" }, { status: 404 });
  if (response.processing_status === "COMPLETED") return NextResponse.json({ status: response.processing_status });
  updateResponseProcessing(id, { status: "PROCESSING", error: null });
  const media = listMediaForResponse(id);
  const provider = getAIProvider();
  let transcript = response.transcript;
  let transcriptStatus: "NOT_NEEDED" | "PENDING_PROVIDER" | "COMPLETED" = transcript ? "COMPLETED" : "NOT_NEEDED";
  try {
    if (!transcript) {
      const audio = media.find((asset) => asset.type === "AUDIO");
      if (audio) {
        try {
          transcript = await provider.transcribe({ bytes: await readPrivateMedia(audio.storage_key), mimeType: audio.mime_type || "application/octet-stream", fileName: audio.original_file_name });
          transcriptStatus = "COMPLETED";
          updateResponseProcessing(id, { status: "PROCESSING", transcript, provider: provider.name });
        } catch (error) {
          if (!process.env.AI_API_KEY) {
            const pending = updateResponseProcessing(id, { status: "PENDING_PROVIDER", error: error instanceof Error ? error.message : "语音转写等待服务配置。", provider: provider.name });
            return NextResponse.json({ status: pending.processing_status, transcript: null, message: "原始音频已保存，等待管理员配置转写服务。" }, { status: 202 });
          }
          throw error;
        }
      }
    }
    const text = response.text_input ?? "";
    const material: SourceMaterial = { text, transcript, audioAssetCount: media.filter((asset) => asset.type === "AUDIO").length, imageAssetCount: media.filter((asset) => asset.type === "IMAGE").length, videoAssetCount: media.filter((asset) => asset.type === "VIDEO").length };
    if (!text.trim() && !transcript?.trim()) {
      const pending = updateResponseProcessing(id, { status: "PENDING_PROVIDER", error: "没有可供整理的文字；音频需要先完成转写。", provider: provider.name });
      return NextResponse.json({ status: pending.processing_status, transcript: null, message: "原始素材已保存，等待转写。" }, { status: 202 });
    }
    const sourceText = [text.trim(), transcript?.trim()].filter(Boolean).join("\n");
    const extractionMaterial = { ...material, text: sourceText };
    let rawOutput = "";
    let parsed: ReturnType<typeof memoryUnitSchema.parse> | null = null;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const output = await provider.extract(extractionMaterial);
        rawOutput = JSON.stringify(output);
        parsed = memoryUnitSchema.parse(output);
        break;
      } catch (error) { lastError = error; }
    }
    if (!parsed) {
      const failed = updateResponseProcessing(id, { status: "NEEDS_ADMIN_REVIEW", error: lastError instanceof Error ? lastError.message : "AI 输出无法解析。", provider: provider.name, rawOutput });
      return NextResponse.json({ status: failed.processing_status, error: "AI 输出需要管理员审核。" }, { status: 422 });
    }
    const decision = decideFollowup(parsed);
    const memory = createMemoryUnit({ id: randomUUID(), responseId: id, payload: parsed });
    const draft = buildMemoryCardDraft(parsed);
    const representativeImage = media.find((asset) => asset.type === "IMAGE");
    const card = createMemoryCard({ id: randomUUID(), responseId: id, memoryUnitId: memory.id, aiTitle: draft.title, aiStory: draft.story, aiOriginalQuote: draft.originalQuote, timeLabel: draft.timeLabel, representativeMediaId: representativeImage?.id ?? null, privacyLevel: draft.privacyLevel });
    const followup = decision.should_follow_up && decision.follow_up_question ? createFollowup({ id: randomUUID(), responseId: id, question: decision.follow_up_question, decision }) : undefined;
    const completed = updateResponseProcessing(id, { status: "COMPLETED", error: null, provider: provider.name, rawOutput, transcript: transcriptStatus === "COMPLETED" ? transcript : null });
    return NextResponse.json({ status: completed.processing_status, response: completed, memoryUnit: memory, card, followup, decision, reply: decision.should_follow_up && decision.follow_up_question ? `你刚刚留下的这段内容很具体。${decision.follow_up_question}` : "今天先把这段留在这里。以后哪天再想起新的细节，我们还可以接着补。" });
  } catch (error) {
    const failed = updateResponseProcessing(id, { status: "NEEDS_ADMIN_REVIEW", error: error instanceof Error ? error.message : "处理失败。", provider: provider.name });
    return NextResponse.json({ status: failed.processing_status, error: "这次整理暂时失败，已标记给管理员处理。" }, { status: 500 });
  }
}
