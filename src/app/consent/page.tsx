import { Suspense } from "react";
import { ConsentForm } from "@/components/consent-form";

export default function ConsentPage() {
  return <main className="shell"><div className="wordmark">人生整理师 <span>种子版</span></div><section className="page-heading"><p className="eyebrow">开始之前</p><h1>这是一段只属于你的记录。</h1><p>原始语音、文字和照片会与 AI 的整理结果分开保存。你可以跳过、修改或删除自己留下的内容。</p></section><Suspense fallback={<p>正在准备...</p>}><ConsentForm /></Suspense></main>;
}
