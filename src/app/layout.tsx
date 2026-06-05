import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "趣灵",
  description: "AI native interactive knowledge learning engine",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
