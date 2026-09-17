import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "人生整理师 · 种子版",
  description: "慢慢把自己的人生说出来。",
  applicationName: "人生整理师",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN"><body>{children}</body></html>
  );
}
