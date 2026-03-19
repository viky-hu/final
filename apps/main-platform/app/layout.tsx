import "./globals.css";
import "./styles/window-1-login.css";
import "./styles/window-2-product.css";
import "./styles/window-3-main.css";
import "./styles/window-4-database.css";
import "@fontsource/zcool-qingke-huangyou";
import "@fontsource/zcool-xiaowei";
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
