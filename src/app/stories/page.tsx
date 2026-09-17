import Link from "next/link";
import { Day7WorkEditor } from "@/components/day7-work-editor";
import { requireCurrentUser } from "@/lib/current-user";
import { findDay7WorkForUser } from "@/lib/database";
import { getDay7Cards } from "@/lib/day7";
import { toPlainObject } from "@/lib/records";

export default async function StoriesPage() {
  const user = await requireCurrentUser();
  const cards = toPlainObject(getDay7Cards(user.id));
  const work = findDay7WorkForUser(user.id);
  const initial = work ? { title: work.title, intro: work.intro, closing: work.closing, cardIds: JSON.parse(work.card_ids_json) as string[] } : null;
  return <main className="shell session-shell"><header className="topbar"><Link className="back-link" href="/memories">返回我的记忆</Link><div className="wordmark">人生整理师 <span>种子版</span></div></header><section className="page-heading"><p className="eyebrow">第 7 天 · 作品</p><h1>《我的 7 个故事》</h1><p>只从你确认过、并允许进入作品的记忆中整理。</p></section><Day7WorkEditor displayName={user.display_name} cards={cards} initial={initial} /></main>;
}
