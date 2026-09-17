import { notFound } from "next/navigation";
import Link from "next/link";
import { MemoryCard } from "@/components/memory-card";
import { requireCurrentUser } from "@/lib/current-user";
import { findLatestMemoryCardFeedback, findMemoryCardForUser } from "@/lib/database";

export default async function MemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const card = findMemoryCardForUser(id, user.id);
  if (!card) notFound();
  const feedback = findLatestMemoryCardFeedback(card.id);
  return <main className="shell session-shell"><header className="topbar"><Link className="back-link" href="/memories">返回我的记忆</Link><div className="wordmark">人生整理师 <span>种子版</span></div></header><MemoryCard initialCard={{ id: card.id, aiTitle: card.ai_title, aiStory: card.ai_story, aiOriginalQuote: card.ai_original_quote, timeLabel: card.time_label, privacyLevel: card.privacy_level, userTitle: card.user_title, userStory: card.user_story, representativeMediaId: card.representative_media_id }} initialRating={feedback?.rating ?? null} /></main>;
}
