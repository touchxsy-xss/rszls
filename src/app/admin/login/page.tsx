import { AdminLoginForm } from "@/components/admin-login-form";

export default function AdminLoginPage() {
  return <main className="shell narrow"><div className="wordmark">人生整理师 <span>研究后台</span></div><section className="page-heading"><p className="eyebrow">管理员入口</p><h1>研究工作台</h1><p>管理员会话与讲述者会话分开保存。</p></section><AdminLoginForm /></main>;
}
