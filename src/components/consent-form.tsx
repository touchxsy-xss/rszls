"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function ConsentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteCode = searchParams.get("invite") ?? "";
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError("");
    setIsSubmitting(true);
    const response = await fetch("/api/auth/pin", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ inviteCode, mode: "set", pin: form.get("pin"), displayName: form.get("displayName"), birthYear: form.get("birthYear") ? Number(form.get("birthYear")) : null, city: form.get("city") || null, consent: form.get("consent") === "on" }),
    });
    const result = await response.json();
    setIsSubmitting(false);
    if (!response.ok) return setError(result.error ?? "暂时无法保存。"), undefined;
    router.replace("/today");
  }

  return <form className="form-stack" onSubmit={submit}>
    <label htmlFor="displayName">怎么称呼你</label>
    <input id="displayName" name="displayName" maxLength={40} required placeholder="例如：李阿姨" />
    <div className="two-columns">
      <label htmlFor="birthYear">出生年份（可跳过）<input id="birthYear" name="birthYear" inputMode="numeric" pattern="[0-9]*" /></label>
      <label htmlFor="city">当前城市（可跳过）<input id="city" name="city" maxLength={80} /></label>
    </div>
    <label htmlFor="pin">设置 4 位 PIN</label>
    <input id="pin" name="pin" type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} required />
    <label className="check-row"><input name="consent" type="checkbox" required /> <span>我同意保存我主动提交的文字、语音、照片、视频；我知道 AI 会辅助整理；我可以随时跳过、修改或删除；默认内容仅自己可见。</span></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="button button-primary" type="submit" disabled={isSubmitting}>{isSubmitting ? "正在保存" : "开始记录"}</button>
  </form>;
}
