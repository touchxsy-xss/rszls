import Link from "next/link";
import { requireCurrentUser } from "@/lib/current-user";
import { listMemoryCardsForUser } from "@/lib/database";
import { MemoryBrowser } from "@/components/memory-browser";
import { getDay7Cards } from "@/lib/day7";
import { toPlainObject } from "@/lib/records";

export default async function MemoriesPage() {
  const user = await requireCurrentUser();
  // node:sqlite rows use a null prototype and cannot cross the Server/Client boundary.
  const cards = toPlainObject(listMemoryCardsForUser(user.id));
  const confirmedCards = toPlainObject(getDay7Cards(user.id));
  return <main className="shell"><header className="topbar"><Link className="back-link" href="/today">返回今天</Link><div className="wordmark">人生整理师 <span>种子版</span></div></header><section className="page-heading"><p className="eyebrow">我的记忆</p><h1>你已经留下 {cards.length} 段记忆</h1><p>每一段都先只属于你自己。</p></section><MemoryBrowser cards={cards as never} /><section className="work-entry"><Link className="button button-secondary" href="/stories">制作《我的 7 个故事》</Link><p className="quiet-copy">已确认并允许进入作品：{confirmedCards.length} 段，至少需要 5 段。</p></section><footer className="bottom-nav"><Link href="/today">今天</Link><Link href="/memories" aria-current="page">我的记忆</Link><span>设置</span></footer></main>;
}
