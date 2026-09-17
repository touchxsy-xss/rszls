"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { SessionRecorder } from "@/components/session-recorder";
import { acceptAttribute } from "@/lib/media-formats";

type Asset = { id: string; type: "AUDIO" | "IMAGE" | "VIDEO"; original_file_name: string; mime_type: string; file_size: number; duration_seconds: number | null };
type ProcessingStatus = "RAW" | "PROCESSING" | "COMPLETED" | "PENDING_PROVIDER" | "NEEDS_ADMIN_REVIEW";

export function SessionEditor({ sessionId, responseId, heading, initialText, initialAssets, initialStatus, initialProcessingStatus, initialMemoryUnit, initialMemoryCardId, initialFollowup, maxDuration }: { sessionId: string; responseId: string | null; heading: string; initialText: string; initialAssets: Asset[]; initialStatus: "OPEN" | "RAW_SAVED"; initialProcessingStatus: ProcessingStatus; initialMemoryUnit: Record<string, unknown> | null; initialMemoryCardId: string | null; initialFollowup: { id: string; question: string; status: string } | null; maxDuration: number }) {
  const [text, setText] = useState(initialText);
  const [assets, setAssets] = useState<Asset[]>(initialAssets);
  const [status, setStatus] = useState(initialStatus);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [savingText, setSavingText] = useState(false);
  const [uploading, setUploading] = useState<"AUDIO" | "IMAGE" | "VIDEO" | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>(initialProcessingStatus);
  const [memoryUnit, setMemoryUnit] = useState<Record<string, unknown> | null>(initialMemoryUnit);
  const [memoryCardId, setMemoryCardId] = useState(initialMemoryCardId);
  const [followup, setFollowup] = useState(initialFollowup);
  const [followupAnswer, setFollowupAnswer] = useState("");
  const [processing, setProcessing] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);

  const editable = status === "OPEN";

  async function saveText() {
    setError("");
    setSavingText(true);
    const response = await fetch("/api/responses/text", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, text }) });
    const result = await response.json();
    setSavingText(false);
    if (!response.ok) return setError(result.error ?? "文字暂时没有保存成功。"), undefined;
    setNotice("文字已保存。");
  }

  async function upload(kind: "AUDIO" | "IMAGE" | "VIDEO", file: File, durationSeconds?: number) {
    setError("");
    setUploading(kind);
    const body = new FormData();
    body.set("sessionId", sessionId); body.set("kind", kind); body.set("file", file);
    if (durationSeconds !== undefined) body.set("durationSeconds", String(durationSeconds));
    const response = await fetch("/api/media", { method: "POST", body });
    const result = await response.json();
    setUploading(null);
    if (!response.ok) throw new Error(result.error ?? "上传暂时没有成功。");
    setAssets((current) => [...current, result.asset]);
    setNotice(`${kind === "IMAGE" ? "照片" : kind === "VIDEO" ? "视频" : "音频"}已私密保存。`);
  }

  async function selectFile(kind: "AUDIO" | "IMAGE" | "VIDEO", event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try { await upload(kind, file); } catch (uploadError) { setError(uploadError instanceof Error ? uploadError.message : "上传暂时没有成功。"); }
  }

  async function endSession() {
    setError("");
    const response = await fetch(`/api/sessions/${sessionId}/end`, { method: "POST" });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "暂时无法结束。"), undefined;
    setStatus(result.session.status);
    setNotice("原始内容已保存。可以开始 AI 整理。");
  }

  async function processResponse() {
    if (!responseId) return;
    setError(""); setProcessing(true); setProcessingStatus("PROCESSING");
    const response = await fetch(`/api/responses/${responseId}/process`, { method: "POST" });
    const result = await response.json();
    setProcessing(false); setProcessingStatus(result.status ?? "NEEDS_ADMIN_REVIEW");
    if (!response.ok && response.status !== 202) return setError(result.error ?? "AI 整理暂时失败。");
    if (result.memoryUnit?.payload_json) setMemoryUnit(JSON.parse(result.memoryUnit.payload_json));
    if (result.card?.id) setMemoryCardId(result.card.id);
    if (result.followup) setFollowup({ id: result.followup.id, question: result.followup.question, status: result.followup.status });
    setNotice(result.message ?? "AI 整理完成。");
  }

  async function answerFollowup() {
    if (!followup || !followupAnswer.trim()) return;
    const response = await fetch(`/api/followups/${followup.id}/answer`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: followupAnswer }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "追问回答没有保存成功。");
    setFollowup((value) => value ? { ...value, status: "ANSWERED" } : value); setFollowupAnswer(""); setNotice("追问回答已保存。");
  }

  async function deleteAsset(asset: Asset) {
    if (!window.confirm(`确定删除这个${asset.type === "IMAGE" ? "照片" : asset.type === "VIDEO" ? "视频" : "录音"}吗？`)) return;
    setError(""); setDeletingAssetId(asset.id);
    const response = await fetch(`/api/media/${asset.id}`, { method: "DELETE" });
    const result = await response.json(); setDeletingAssetId(null);
    if (!response.ok) return setError(result.error ?? "文件删除失败。");
    setAssets((current) => current.filter((item) => item.id !== asset.id));
    setNotice("文件已删除。");
  }

  return <main className="shell session-shell"><header className="topbar"><Link className="back-link" href="/today">返回今天</Link><div className="wordmark">人生整理师 <span>种子版</span></div></header><section className="session-heading"><p className="eyebrow">这一次</p><h1>{heading}</h1><p>你可以只用一种方式，也可以慢慢补充。</p></section>{editable ? <><section className="input-section"><h2>说一说</h2><SessionRecorder maxDuration={maxDuration} onReady={(file, duration) => upload("AUDIO", file, duration)} /><label className="file-picker"><span>选择本地音频文件</span><input className="file-picker-input" type="file" accept={acceptAttribute("AUDIO")} onChange={(event) => selectFile("AUDIO", event)} disabled={uploading !== null} /></label><p className="format-hint">支持 MP3、M4A、AAC、WAV、OGG、WEBM。</p></section><section className="input-section"><h2>写下来</h2><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="想到哪里，就从哪里写起。" maxLength={30000} /><button className="button button-secondary" type="button" disabled={!text.trim() || savingText} onClick={saveText}>{savingText ? "正在保存" : "保存文字"}</button></section><section className="input-section"><h2>带一张照片或一段视频</h2><div className="upload-grid"><label className="file-picker"><span>{uploading === "IMAGE" ? "正在上传照片" : "上传照片"}</span><input className="file-picker-input" type="file" accept={acceptAttribute("IMAGE")} onChange={(event) => selectFile("IMAGE", event)} disabled={uploading !== null} /></label><label className="file-picker"><span>{uploading === "VIDEO" ? "正在上传视频" : "上传视频"}</span><input className="file-picker-input" type="file" accept={acceptAttribute("VIDEO")} onChange={(event) => selectFile("VIDEO", event)} disabled={uploading !== null} /></label></div><p className="format-hint">视频支持 MP4、MOV、M4V、WEBM。照片支持 JPG、PNG、HEIC、WEBP。</p></section></> : <section className="saved-panel"><p>这次讲述的原始内容已经保存。处理状态：{processingStatus === "PENDING_PROVIDER" ? "等待转写服务" : processingStatus === "NEEDS_ADMIN_REVIEW" ? "等待管理员审核" : processingStatus === "COMPLETED" ? "已完成" : processingStatus === "PROCESSING" ? "处理中" : "待整理"}。</p>{responseId && processingStatus !== "COMPLETED" && <button className="button button-primary" type="button" onClick={processResponse} disabled={processing}> {processing ? "正在整理" : "开始 AI 整理"}</button>}{memoryCardId && <Link className="button button-secondary card-link" href={`/memories/${memoryCardId}`}>查看记忆卡</Link>}</section>}{!editable && text && <section className="input-section raw-text"><h2>这次写下的话</h2><p>{text}</p></section>}{memoryUnit && <section className="input-section"><h2>记忆单元</h2><h3>{String(memoryUnit.title ?? "未命名记忆")}</h3><p>{String(memoryUnit.summary ?? "")}</p><p className="quiet-copy">原话：{String(memoryUnit.original_quote ?? "")}</p></section>}{followup && followup.status === "PENDING" && <section className="input-section"><h2>想再问一句</h2><p>{followup.question}</p><textarea value={followupAnswer} onChange={(event) => setFollowupAnswer(event.target.value)} placeholder="可以回答，也可以先放在这里。" maxLength={30000} /><button className="button button-secondary" type="button" disabled={!followupAnswer.trim()} onClick={answerFollowup}>保存追问回答</button></section>}{assets.length > 0 && <section className="input-section"><h2>已保存的原始素材</h2><div className="asset-list">{assets.map((asset) => <article className="asset-row" key={asset.id}>{asset.type === "IMAGE" ? <Image src={`/api/media/${asset.id}`} alt="用户上传的照片" width={84} height={64} unoptimized /> : asset.type === "VIDEO" ? <video controls src={`/api/media/${asset.id}`} /> : <audio controls src={`/api/media/${asset.id}`} />}<div><strong>{asset.type === "IMAGE" ? "照片" : asset.type === "VIDEO" ? "视频" : "录音"}</strong><p>{asset.original_file_name}</p>{processingStatus !== "COMPLETED" && <button className="asset-delete" type="button" disabled={deletingAssetId === asset.id} onClick={() => deleteAsset(asset)}>{deletingAssetId === asset.id ? "正在删除" : "删除这个文件"}</button>}</div></article>)}</div></section>}{notice && <p className="saved-copy" role="status">{notice}</p>}{error && <p className="form-error" role="alert">{error}</p>}{editable && <button className="button button-primary finish-button" type="button" onClick={endSession}>今天先到这里</button>}</main>;
}
