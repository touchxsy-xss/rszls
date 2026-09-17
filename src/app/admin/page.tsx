import { requireAdmin } from "@/lib/current-user";
import { AdminDashboard } from "@/components/admin-dashboard";
import { findAdminRecord, getAdminAnalytics, listAdminRecords, listAdminUsers, listDailyPrompts } from "@/lib/database";
import { toPlainObject } from "@/lib/records";

export default async function AdminPage() {
  await requireAdmin();
  const records = listAdminRecords().flatMap((record) => {
    const detail = findAdminRecord(record.id);
    return detail ? [toPlainObject(detail)] : [];
  });
  return <main className="shell admin-shell"><div className="wordmark">人生整理师 <span>研究后台</span></div><section className="page-heading"><p className="eyebrow">已验证管理员身份</p><h1>研究工作台</h1><p>保留原始素材，人工修订 AI 派生内容，并记录研究中的错误与处理时间。</p></section><AdminDashboard records={records as never} prompts={toPlainObject(listDailyPrompts()) as never} users={toPlainObject(listAdminUsers()) as never} analytics={toPlainObject(getAdminAnalytics()) as never} /></main>;
}
