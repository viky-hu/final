import { WindowCard } from "ui-components";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-6 px-6">
      <h1 className="text-3xl font-bold tracking-tight">final / Main Platform</h1>
      <p className="text-slate-600">Next.js + TypeScript + Tailwind 已初始化完成。</p>
      <WindowCard title="UI Components 联调正常">
        这个卡片组件来自 packages/ui-components。
      </WindowCard>
    </main>
  );
}
