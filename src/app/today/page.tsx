import Link from "next/link";
import { SessionLauncher } from "@/components/session-launcher";
import { requireCurrentUser } from "@/lib/current-user";
import { findPromptByDay } from "@/lib/database";

export default async function TodayPage() {
  const user = await requireCurrentUser();
  const prompt = findPromptByDay(user.experiment_day);
  if (!prompt) throw new Error("今日入口尚未配置。");
  const date = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(new Date());

  return <main className="shell"><header className="topbar"><div className="wordmark">人生整理师 <span>种子版</span></div><span>{date}</span></header><section className="today-card"><p className="eyebrow">第 {user.experiment_day} 天 · {prompt.title}</p><h1>{prompt.prompt_text}</h1><p>{prompt.guidance_text}</p></section><div className="today-actions" aria-label="输入方式"><SessionLauncher className="input-launcher" mode="DAILY">开始录音</SessionLauncher><SessionLauncher className="input-launcher" mode="DAILY">打字回答</SessionLauncher><SessionLauncher className="input-launcher" mode="DAILY">上传照片</SessionLauncher><SessionLauncher className="input-launcher" mode="DAILY">上传视频</SessionLauncher></div><div className="text-actions"><button type="button" disabled>换一个轻松点的话题</button><button type="button" disabled>今天不想聊</button><SessionLauncher className="text-button" mode="FREE">我突然想起一件事</SessionLauncher></div><footer className="bottom-nav"><Link href="/today" aria-current="page">今天</Link><Link href="/memories">我的记忆</Link><span>设置</span></footer></main>;
}
