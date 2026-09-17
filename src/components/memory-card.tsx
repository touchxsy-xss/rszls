"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { privacyLabel } from "@/lib/memory-cards";

type Card = {
  id: string;
  aiTitle: string;
  aiStory: string;
  aiOriginalQuote: string;
  timeLabel: string | null;
  privacyLevel: "P0_PRIVATE" | "P1_PERSONAL_ARCHIVE";
  userTitle: string | null;
  userStory: string | null;
  representativeMediaId: string | null;
};

const feedbackOptions = [
  ["VERY_LIKE_ME", "很像"],
  ["MOSTLY_LIKE_ME", "基本像"],
  ["NOT_MUCH_LIKE_ME", "不太像"],
  ["FACTUAL_ERROR", "有事实错误"],
] as const;

export function MemoryCard({ initialCard, initialRating }: { initialCard: Card; initialRating: string | null }) {
  const router = useRouter();
  const [card, setCard] = useState(initialCard);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(initialCard.userTitle ?? initialCard.aiTitle);
  const [story, setStory] = useState(initialCard.userStory ?? initialCard.aiStory);
  const [privacyLevel, setPrivacyLevel] = useState(initialCard.privacyLevel);
  const [rating, setRating] = useState(initialRating);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const displayTitle = card.userTitle ?? card.aiTitle;
  const displayStory = card.userStory ?? card.aiStory;

  async function save() {
    setSaving(true); setError("");
    const response = await fetch(`/api/memories/${card.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, story, privacyLevel }) });
    const result = await response.json(); setSaving(false);
    if (!response.ok) return setError(result.error ?? "这次修改没有保存成功。");
    setCard((current) => ({ ...current, userTitle: result.card.user_title, userStory: result.card.user_story, privacyLevel: result.card.privacy_level }));
    setEditing(false); setNotice("你的修改已保存，原始 AI 版本仍被保留。");
  }

  async function sendFeedback(nextRating: string) {
    setError("");
    const response = await fetch(`/api/memories/${card.id}/feedback`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rating: nextRating }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "反馈暂时没有记录成功。");
    setRating(result.feedback.rating); setNotice("谢谢，这个反馈已记录。");
  }

  async function remove() {
    setSaving(true); setError("");
    const response = await fetch(`/api/memories/${card.id}`, { method: "DELETE" });
    const result = await response.json(); setSaving(false);
    if (!response.ok) return setError(result.error ?? "删除暂时没有完成。");
    router.replace("/memories"); router.refresh();
  }

  return <article className="memory-card-detail">
    {card.representativeMediaId && <Image className="memory-hero-image" src={`/api/media/${card.representativeMediaId}`} alt="这段记忆的代表照片" width={640} height={360} unoptimized />}
    {editing ? <div className="form-stack card-edit-form"><label>标题<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label><label>这段记忆<textarea value={story} maxLength={500} onChange={(event) => setStory(event.target.value)} /></label><fieldset className="privacy-choice"><legend>保存范围</legend><label className="check-row"><input type="radio" name="privacy" checked={privacyLevel === "P0_PRIVATE"} onChange={() => setPrivacyLevel("P0_PRIVATE")} />这段只给自己</label><label className="check-row"><input type="radio" name="privacy" checked={privacyLevel === "P1_PERSONAL_ARCHIVE"} onChange={() => setPrivacyLevel("P1_PERSONAL_ARCHIVE")} />可进入未来作品</label></fieldset><div className="card-actions"><button className="button button-secondary" type="button" onClick={() => setEditing(false)}>取消</button><button className="button button-primary" type="button" disabled={saving} onClick={save}>{saving ? "正在保存" : "保存修改"}</button></div></div> : <><p className="eyebrow">{card.timeLabel ?? "一段记忆"}</p><h1>{displayTitle}</h1><p className="memory-story">{displayStory}</p><blockquote>“{card.aiOriginalQuote}”</blockquote><p className="privacy-label">{privacyLabel(card.privacyLevel)}</p><div className="card-actions"><button className="button button-secondary" type="button" onClick={() => setEditing(true)}>修改</button><button className="button button-secondary danger" type="button" onClick={() => setConfirmingDelete(true)}>删除</button></div></>}
    {confirmingDelete && <section className="delete-confirmation" role="alert"><h2>确定删除这段记忆？</h2><p>这会同时删除原始文字、录音、照片、视频、转写和 AI 整理内容，删除后无法恢复。</p><div className="card-actions"><button className="button button-secondary" type="button" onClick={() => setConfirmingDelete(false)}>保留这段记忆</button><button className="button button-primary danger-fill" type="button" disabled={saving} onClick={remove}>{saving ? "正在删除" : "确认删除"}</button></div></section>}
    <section className="feedback-panel"><h2>这段记录像你自己吗？</h2><div className="feedback-options">{feedbackOptions.map(([value, label]) => <button className={`feedback-button ${rating === value ? "selected" : ""}`} key={value} type="button" onClick={() => sendFeedback(value)}>{label}</button>)}</div></section>
    {notice && <p className="saved-copy" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <p className="quiet-link"><Link href="/memories">返回我的记忆</Link></p>
  </article>;
}
