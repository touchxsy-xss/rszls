"use client";

import { useMemo, useState } from "react";

type Card = { id: string; ai_title: string; ai_story: string; ai_original_quote: string; time_label: string | null; user_title: string | null; user_story: string | null };

export function Day7WorkEditor({ displayName, cards, initial }: { displayName: string; cards: Card[]; initial: { title: string; intro: string; closing: string; cardIds: string[] } | null }) {
  const [selectedIds, setSelectedIds] = useState<string[]>(initial?.cardIds.filter((id) => cards.some((card) => card.id === id)) ?? cards.slice(0, 7).map((card) => card.id));
  const [title, setTitle] = useState(initial?.title ?? "《我的 7 个故事》");
  const [intro, setIntro] = useState(initial?.intro ?? `${displayName} 留下的 ${selectedIds.length} 段记忆。每一段，都来自本人选择保留的记录。`);
  const [closing, setClosing] = useState(initial?.closing ?? "这些故事先留在这里。以后想起新的细节，还可以继续补上。");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedCards = useMemo(() => selectedIds.map((id) => cards.find((card) => card.id === id)).filter((card): card is Card => Boolean(card)), [cards, selectedIds]);

  function toggle(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length >= 7 ? current : [...current, id]);
    setNotice("");
  }

  async function save() {
    setSaving(true); setError(""); setNotice("");
    const response = await fetch("/api/day7/save", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, intro, closing, cardIds: selectedIds }) });
    const result = await response.json(); setSaving(false);
    if (!response.ok) return setError(result.error ?? "作品草稿没有保存成功。");
    setNotice("作品草稿已保存。");
  }

  async function exportPdf() {
    setSaving(true); setError(""); setNotice("");
    const response = await fetch("/api/day7/export");
    if (!response.ok) { const result = await response.json(); setSaving(false); return setError(result.error ?? "PDF 暂时无法导出。"); }
    const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "我的7个故事.pdf"; anchor.click(); URL.revokeObjectURL(url); setSaving(false); setNotice("PDF 已开始下载。");
  }

  return <>
    <section className="day7-progress"><strong>{selectedIds.length} / 7</strong><span>{selectedIds.length < 5 ? `还需要选择 ${5 - selectedIds.length} 段已确认的记忆` : "可以保存并导出作品"}</span></section>
    <section className="day7-selection"><h2>选择故事</h2>{cards.length === 0 ? <p className="saved-panel">还没有同时满足“管理员已确认”和“允许进入未来作品”的记忆。</p> : cards.map((card) => <label className="day7-choice" key={card.id}><input type="checkbox" checked={selectedIds.includes(card.id)} onChange={() => toggle(card.id)} /><span><strong>{card.user_title ?? card.ai_title}</strong><small>{card.time_label ?? "一段记忆"}</small></span></label>)}</section>
    <section className="day7-editor"><h2>作品草稿</h2><label>标题<input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} /></label><label>序言<textarea value={intro} maxLength={500} onChange={(event) => setIntro(event.target.value)} /></label><label>结尾<textarea value={closing} maxLength={500} onChange={(event) => setClosing(event.target.value)} /></label><div className="card-actions"><button className="button button-primary" type="button" disabled={saving || selectedIds.length < 5} onClick={save}>保存作品草稿</button><button className="button button-secondary" type="button" disabled={saving || selectedIds.length < 5} onClick={exportPdf}>导出 PDF</button></div>{notice && <p className="saved-copy" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}</section>
    <section className="day7-preview"><h2>阅读预览</h2><h3>{title}</h3><p>{intro}</p><ol>{selectedCards.map((card) => <li key={card.id}><strong>{card.user_title ?? card.ai_title}</strong><small>{card.time_label ?? "一段记忆"}</small><p>{card.user_story ?? card.ai_story}</p><blockquote>“{card.ai_original_quote}”</blockquote></li>)}</ol><p>{closing}</p></section>
  </>;
}
