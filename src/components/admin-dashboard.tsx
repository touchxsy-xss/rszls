"use client";

import { useState } from "react";
import Image from "next/image";

type AdminRecord = {
  record: { id: string; display_name: string; invite_code: string; text_input: string | null; transcript: string | null; processing_status: string; processing_error: string | null; updated_at: string };
  media: Array<{ id: string; type: "AUDIO" | "IMAGE" | "VIDEO"; original_file_name: string }>;
  units: Array<{ id: string; version: number; source: string; payload_json: string }>;
  followup: { question: string; status: string } | null;
  review: { memory_unit_id: string | null; ai_error: number; hallucination: number; over_interpretation: number; duplicate_question: number; manual_minutes: number | null; notes: string | null } | null;
};

type Prompt = { day_number: number; title: string; prompt_text: string; guidance_text: string };

const blankUnit = {
  title: "待人工整理", summary: "请只依据原始素材填写。", original_quote: "", time_text: null, age_text: null, age_inferred: false,
  people: [], places: [], events: [], roles: [], objects: [], emotions_explicit: [], emotions_inferred: [], themes: [],
  story_maturity: "S0_CLUE", memory_type: "SMALL_MEMORY", privacy_level: "P0_PRIVATE", unresolved_clues: [], recommended_followup: null, followup_priority: 0, sensitive: false,
};

function RecordEditor({ initial }: { initial: AdminRecord }) {
  const [record, setRecord] = useState(initial);
  const latest = record.units[0];
  const [json, setJson] = useState(latest?.payload_json ?? JSON.stringify(blankUnit, null, 2));
  const [question, setQuestion] = useState(record.followup?.question ?? "");
  const [review, setReview] = useState({
    memoryUnitId: record.review?.memory_unit_id ?? latest?.id ?? null,
    aiError: Boolean(record.review?.ai_error), hallucination: Boolean(record.review?.hallucination),
    overInterpretation: Boolean(record.review?.over_interpretation), duplicateQuestion: Boolean(record.review?.duplicate_question),
    manualMinutes: record.review?.manual_minutes ?? null, notes: record.review?.notes ?? "",
  });
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function request(url: string, method: string, body: unknown) {
    setSaving(true); setError("");
    const response = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json(); setSaving(false);
    if (!response.ok) throw new Error(result.error ?? "保存失败。");
    return result;
  }

  async function saveUnit() {
    try {
      const payload = JSON.parse(json);
      const result = await request(`/api/admin/records/${record.record.id}/memory`, "PATCH", payload);
      const unit = result.memoryUnit as AdminRecord["units"][number];
      setRecord((current) => ({ ...current, units: [unit, ...current.units] }));
      setReview((current) => ({ ...current, memoryUnitId: unit.id }));
      setNotice("已保存人工修订版本，原 AI 版本仍保留。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "JSON 无法保存。"); }
  }

  async function updateFollowup(action: "ADOPT" | "EDIT" | "DISMISS") {
    try {
      const result = await request(`/api/admin/records/${record.record.id}/followup`, "PATCH", { action, question: question || undefined });
      setRecord((current) => ({ ...current, followup: result.followup }));
      setNotice(action === "DISMISS" ? "这条追问不会展示给用户。" : "追问决定已保存。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "追问无法保存。"); }
  }

  async function saveReview() {
    try {
      const result = await request(`/api/admin/records/${record.record.id}/review`, "PUT", review);
      setRecord((current) => ({ ...current, review: result.review }));
      setNotice("研究修订记录已保存。");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "研究记录无法保存。"); }
  }

  return <article className="admin-record">
    <header><p className="eyebrow">{record.record.invite_code} · {record.record.processing_status}</p><h2>{record.record.display_name}</h2><p className="quiet-copy">最后更新：{record.record.updated_at}</p></header>
    <section><h3>原始素材</h3>{record.record.text_input && <div className="raw-text"><strong>原始文字</strong><p>{record.record.text_input}</p></div>}{record.record.transcript && <div className="raw-text"><strong>转写</strong><p>{record.record.transcript}</p></div>}{record.media.length > 0 && <div className="admin-media">{record.media.map((asset) => <div key={asset.id}>{asset.type === "IMAGE" && <Image src={`/api/media/${asset.id}`} alt={asset.original_file_name} width={180} height={112} unoptimized />}{asset.type === "AUDIO" && <audio controls src={`/api/media/${asset.id}`} />}{asset.type === "VIDEO" && <video controls src={`/api/media/${asset.id}`} />}<small>{asset.original_file_name}</small></div>)}</div>}{record.record.processing_error && <p className="form-error">{record.record.processing_error}</p>}</section>
    <section><h3>AI 结构化数据</h3><p className="quiet-copy">保存时会新建一个人工修订版本，不会覆盖原始 AI 输出。</p><textarea className="admin-json" value={json} onChange={(event) => setJson(event.target.value)} spellCheck={false} aria-label="MemoryUnit JSON" /><button className="button button-primary" type="button" disabled={saving} onClick={saveUnit}>保存人工修订</button></section>
    <section><h3>追问</h3><p className="quiet-copy">当前状态：{record.followup?.status ?? "尚无建议"}</p><textarea className="admin-question" value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={240} placeholder="输入一个自然的追问" /><div className="card-actions"><button className="button button-secondary" type="button" disabled={saving || !question} onClick={() => updateFollowup("ADOPT")}>采用</button><button className="button button-secondary" type="button" disabled={saving || !question} onClick={() => updateFollowup("EDIT")}>修改后采用</button><button className="button button-secondary danger" type="button" disabled={saving} onClick={() => updateFollowup("DISMISS")}>不追问</button></div></section>
    <section><h3>研究修订</h3><div className="review-grid">{[["aiError", "发现事实错误"], ["hallucination", "AI 编造"], ["overInterpretation", "过度解读"], ["duplicateQuestion", "重复提问"]].map(([key, label]) => <label className="check-row" key={key}><input type="checkbox" checked={review[key as keyof typeof review] as boolean} onChange={(event) => setReview((current) => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div><label>人工处理分钟数<input type="number" min="0" max="240" value={review.manualMinutes ?? ""} onChange={(event) => setReview((current) => ({ ...current, manualMinutes: event.target.value === "" ? null : Number(event.target.value) }))} /></label><label>研究备注<textarea value={review.notes ?? ""} maxLength={2000} onChange={(event) => setReview((current) => ({ ...current, notes: event.target.value }))} /></label><button className="button button-primary" type="button" disabled={saving} onClick={saveReview}>保存研究记录</button></section>
    {notice && <p className="saved-copy" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
  </article>;
}

function PromptOverride({ prompts }: { prompts: Prompt[] }) {
  const [day, setDay] = useState(prompts[0]?.day_number ?? 1);
  const selected = prompts.find((prompt) => prompt.day_number === day) ?? prompts[0];
  const [draft, setDraft] = useState(selected);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  function switchDay(nextDay: number) { const prompt = prompts.find((item) => item.day_number === nextDay)!; setDay(nextDay); setDraft(prompt); setNotice(""); }
  async function save() { setError(""); const response = await fetch("/api/admin/prompts/override", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ day, title: draft.title, promptText: draft.prompt_text, guidanceText: draft.guidance_text }) }); const result = await response.json(); if (!response.ok) return setError(result.error ?? "次日问题未保存。"); setNotice(`第 ${day} 天入口已由管理员更新。`); }
  if (!draft) return null;
  return <section className="admin-prompt"><h2>次日记忆入口</h2><label>选择测试日<select value={day} onChange={(event) => switchDay(Number(event.target.value))}>{prompts.map((prompt) => <option key={prompt.day_number} value={prompt.day_number}>第 {prompt.day_number} 天 · {prompt.title}</option>)}</select></label><label>标题<input value={draft.title} maxLength={120} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label><label>主问题<textarea value={draft.prompt_text} maxLength={1000} onChange={(event) => setDraft({ ...draft, prompt_text: event.target.value })} /></label><label>引导语<input value={draft.guidance_text} maxLength={500} onChange={(event) => setDraft({ ...draft, guidance_text: event.target.value })} /></label><button className="button button-primary" type="button" onClick={save}>保存管理员入口</button>{notice && <p className="saved-copy">{notice}</p>}{error && <p className="form-error">{error}</p>}</section>;
}

export function AdminDashboard({ records, prompts, users, analytics }: { records: AdminRecord[]; prompts: Prompt[]; users: Array<Record<string, unknown>>; analytics: { events: Array<{ event_name: string; count: number }>; feedback: Array<{ rating: string; count: number }>; review: Record<string, unknown> } }) {
  return <><section className="admin-metrics"><h2>实验概览</h2><div className="metric-grid"><p><strong>{users.length}</strong> 位测试者</p><p><strong>{records.length}</strong> 条原始记录</p><p><strong>{String(analytics.review.reviewed_count ?? 0)}</strong> 条已人工审核</p><p><strong>{String(analytics.review.manual_minutes ?? 0)}</strong> 分钟人工处理</p></div><div className="metric-list"><p>记忆卡反馈：{analytics.feedback.map((item) => `${item.rating} ${item.count}`).join(" · ") || "尚无"}</p><p>行为事件：{analytics.events.map((item) => `${item.event_name} ${item.count}`).join(" · ") || "尚无"}</p></div></section><PromptOverride prompts={prompts} /><section className="admin-users"><h2>测试用户</h2>{users.map((user) => <p key={String(user.id)}><strong>{String(user.invite_code)} · {String(user.display_name)}</strong>　记忆 {String(user.memory_count)} 段，照片 {String(user.image_count)} 张，待处理 {Number(user.has_pending_review) ? "是" : "否"}</p>)}</section><section className="admin-record-list"><h2>原始记录与人工审核</h2>{records.length === 0 ? <p>暂时还没有记录。用户提交后会在这里出现。</p> : records.map((record) => <RecordEditor key={record.record.id} initial={record} />)}</section></>;
}
