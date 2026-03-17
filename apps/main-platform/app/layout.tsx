import "./globals.css";
import "@fontsource/zcool-qingke-huangyou";
import "@fontsource/michroma";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Main Platform",
  description: "Main app for final monorepo"
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
