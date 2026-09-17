"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const password = new FormData(event.currentTarget).get("password");
    const response = await fetch("/api/auth/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "暂时无法登录。"), undefined;
    router.replace("/admin");
  }

  return <form className="form-stack" onSubmit={submit}><label htmlFor="password">管理员密码</label><input id="password" name="password" type="password" required autoFocus />{error && <p className="form-error" role="alert">{error}</p>}<button className="button button-primary" type="submit">进入研究工作台</button></form>;
}
