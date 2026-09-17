import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return <main className="shell narrow"><div className="wordmark">人生整理师 <span>种子版</span></div><section className="page-heading"><p className="eyebrow">欢迎回来</p><h1>继续说说你的人生。</h1></section><Suspense fallback={<p>正在准备...</p>}><LoginForm /></Suspense></main>;
}
