import { memoryUnitSchema } from "./validation";
import type { z } from "zod";

export type MemoryUnit = z.infer<typeof memoryUnitSchema>;

export type SourceMaterial = {
  text: string;
  transcript: string | null;
  audioAssetCount: number;
  imageAssetCount: number;
  videoAssetCount: number;
};

export type FollowupDecision = {
  should_follow_up: boolean;
  follow_up_question: string | null;
  reason_internal: string;
  emotional_risk: "LOW" | "MEDIUM" | "HIGH";
};

export type AIProcessingResult = {
  provider: string;
  transcript: string | null;
  transcriptStatus: "NOT_NEEDED" | "PENDING_PROVIDER" | "COMPLETED";
  memoryUnit: MemoryUnit | null;
  followup: FollowupDecision;
  rawOutput: string;
  needsAdminReview: boolean;
};

export const MEMORY_EXTRACTION_PROMPT_VERSION = "phase3-memory-unit-v1";

export interface SpeechToTextProvider {
  transcribe(file: { bytes: Buffer; mimeType: string; fileName: string }): Promise<string>;
}

export interface MemoryExtractionProvider {
  extract(material: SourceMaterial): Promise<unknown>;
}

function firstSentence(text: string) {
  const normalized = text.trim().replace(/\s+/g, " ");
  return normalized.split(/[。！？.!?]/)[0]?.slice(0, 80) || "一段还在展开的记忆";
}

function quote(text: string) {
  return text.trim().replace(/\s+/g, " ").slice(0, 240);
}

function buildRuleBasedMemory(text: string): MemoryUnit {
  const normalized = text.trim();
  const short = normalized.length < 80;
  const long = normalized.length >= 260;
  const title = firstSentence(normalized);
  const unresolved = short ? ["这段记忆以后还可以补充哪些具体细节？"] : [];
  return memoryUnitSchema.parse({
    title,
    summary: normalized.slice(0, 2000),
    original_quote: quote(normalized),
    time_text: null,
    age_text: null,
    age_inferred: false,
    people: [],
    places: [],
    events: [],
    roles: [],
    objects: [],
    emotions_explicit: [],
    emotions_inferred: [],
    themes: [],
    story_maturity: short ? "S1_FACT" : long ? "S2_STORY" : "S1_FACT",
    memory_type: "SMALL_MEMORY",
    privacy_level: "P0_PRIVATE",
    unresolved_clues: unresolved,
    recommended_followup: short ? null : "你还记得这件事里哪一个具体的画面？",
    followup_priority: short ? 0 : 0.45,
    sensitive: false,
  });
}

export class RuleBasedProvider implements SpeechToTextProvider, MemoryExtractionProvider {
  readonly name = "rule-based-safe-fallback";

  async transcribe(_file: { bytes: Buffer; mimeType: string; fileName: string }): Promise<string> {
    void _file;
    throw new Error("当前未配置服务端语音转写 Provider，原始音频已保存，等待管理员处理。");
  }

  async extract(material: SourceMaterial) {
    if (!material.text.trim()) throw new Error("没有可供整理的文字。音频需要先完成转写。");
    return buildRuleBasedMemory(material.text);
  }
}

export class OpenAICompatibleProvider implements SpeechToTextProvider, MemoryExtractionProvider {
  readonly name = "openai-compatible";
  private readonly baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  private readonly apiKey = process.env.AI_API_KEY!;
  private readonly model = process.env.AI_MODEL ?? "gpt-4o-mini";
  private readonly transcriptionModel = process.env.AI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe";

  private async request(path: string, body: unknown) {
    const response = await fetch(`${this.baseUrl}${path}`, { method: "POST", headers: { authorization: `Bearer ${this.apiKey}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`AI provider returned ${response.status}.`);
    return response.json() as Promise<{ choices?: Array<{ message?: { content?: string } }> }>;
  }

  async transcribe(file: { bytes: Buffer; mimeType: string; fileName: string }) {
    const form = new FormData();
    form.set("model", this.transcriptionModel);
    form.set("response_format", "json");
    form.set("file", new Blob([new Uint8Array(file.bytes)], { type: file.mimeType }), file.fileName);
    const response = await fetch(`${this.baseUrl}/audio/transcriptions`, { method: "POST", headers: { authorization: `Bearer ${this.apiKey}` }, body: form });
    if (!response.ok) throw new Error(`AI transcription provider returned ${response.status}.`);
    const result = await response.json() as { text?: string };
    if (!result.text?.trim()) throw new Error("AI transcription returned no text.");
    return result.text.trim();
  }

  async extract(material: SourceMaterial) {
    const system = `你是人生整理师的整理者（提示版本 ${MEMORY_EXTRACTION_PROMPT_VERSION}）。只能依据用户明确说出的内容输出 JSON，不得创造事实，不得添加未明确表达的情绪；推算信息必须标记 inferred=true，且不得写入正文。一次最多给出一个自然追问。summary 是记忆卡短故事：在原始材料有足够明确细节时写成 150–500 个中文字符；素材不足时宁可保留较短的原文摘要，也绝不能为凑长度补写细节。严格遵守给定 schema。字段必须完整：title, summary, original_quote, time_text, age_text, age_inferred, people, places, events, roles, objects, emotions_explicit, emotions_inferred, themes, story_maturity, memory_type, privacy_level, unresolved_clues, recommended_followup, followup_priority, sensitive。`;
    const result = await this.request("/chat/completions", { model: this.model, temperature: 0, response_format: { type: "json_object" }, messages: [{ role: "system", content: system }, { role: "user", content: JSON.stringify({ source_text: material.text, transcript: material.transcript, media_counts: { audio: material.audioAssetCount, image: material.imageAssetCount, video: material.videoAssetCount } }) }] });
    const content = result.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI extraction returned no JSON.");
    return JSON.parse(content);
  }
}

export function getAIProvider(): (SpeechToTextProvider & MemoryExtractionProvider) & { name: string } {
  return process.env.AI_API_KEY ? new OpenAICompatibleProvider() : new RuleBasedProvider();
}

export function decideFollowup(memory: MemoryUnit): FollowupDecision {
  if (memory.sensitive || memory.emotions_explicit.length > 0 && memory.story_maturity === "S3_EMOTIONAL_STORY") return { should_follow_up: false, follow_up_question: null, reason_internal: "sensitive_or_high_emotion", emotional_risk: memory.sensitive ? "HIGH" : "MEDIUM" };
  if (!memory.recommended_followup || memory.followup_priority < 0.25 || memory.story_maturity === "S1_FACT" && memory.unresolved_clues.length === 0) return { should_follow_up: false, follow_up_question: null, reason_internal: "low_followup_gain", emotional_risk: "LOW" };
  return { should_follow_up: true, follow_up_question: memory.recommended_followup, reason_internal: "unfinished_detail_with_low_risk", emotional_risk: "LOW" };
}

export function buildAIReply(decision: FollowupDecision) {
  return decision.should_follow_up && decision.follow_up_question
    ? `你刚刚留下的这段内容很具体。${decision.follow_up_question}`
    : "今天先把这段留在这里。以后哪天再想起新的细节，我们还可以接着补。";
}
