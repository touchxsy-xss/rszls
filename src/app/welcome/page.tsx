import Link from "next/link";
import { InviteForm } from "@/components/invite-form";

export default function WelcomePage() {
  return <main className="shell welcome-shell"><div className="wordmark">人生整理师 <span>种子版</span></div><section className="intro"><p className="eyebrow">留下一些真实的片段</p><h1>慢慢把自己的人生说出来。</h1><p>从一张照片、一段声音，或一件忽然想起的事开始。想到多少说多少。</p></section><InviteForm /><p className="quiet-link"><Link href="/admin/login">管理员入口</Link></p></main>;
}
