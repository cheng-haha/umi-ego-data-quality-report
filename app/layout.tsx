import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "UMI / Ego 数据质量审计报告",
  description: "UMI 与 Ego 数据的视频、同步、标定和 EEF 可用性公开审计报告。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
