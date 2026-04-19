"use client";

import { memo, useRef, useState, useEffect, useCallback, useMemo } from "react";
import { gsap } from "gsap";

/* ── 时间段类型 ── */
type Period = "当天" | "本周" | "本月" | "本季" | "本年";
const PERIODS: Period[] = ["当天", "本周", "本月", "本季", "本年"];
const SELF_NODE_PLACEHOLDER = "__SELF_NODE__";

/* ── 颜色：从 #6367FF → #C9BEFF，5 档渐变 ── */
const BAR_COLORS = [
  "#6367FF",
  "#6E5CFF",
  "#7C50FF",
  "#8E44FF",
  "#A855F7",
];

/* ── 各时间段模拟数据 ── */
const MOCK_DATA: Record<Period, { name: string; value: number }[]> = {
  当天: [
    { name: SELF_NODE_PLACEHOLDER, value: 14 },
    { name: "法学教研室", value: 11 },
    { name: "党史教育中心", value: 8 },
    { name: "语言实践中心", value: 6 },
    { name: "图书馆-红色经典区", value: 4 },
  ],
  本周: [
    { name: "党史教育中心", value: 52 },
    { name: SELF_NODE_PLACEHOLDER, value: 47 },
    { name: "图书馆-红色经典区", value: 35 },
    { name: "法学教研室", value: 28 },
    { name: "马克思理论教研室", value: 19 },
  ],
  本月: [
    { name: SELF_NODE_PLACEHOLDER, value: 183 },
    { name: "法学教研室", value: 154 },
    { name: "语言实践中心", value: 121 },
    { name: "党史教育中心", value: 98 },
    { name: "马克思理论教研室", value: 72 },
  ],
  本季: [
    { name: SELF_NODE_PLACEHOLDER, value: 410 },
    { name: "党史教育中心", value: 380 },
    { name: "法学教研室", value: 297 },
    { name: "图书馆-红色经典区", value: 234 },
    { name: "语言实践中心", value: 188 },
  ],
  本年: [
    { name: SELF_NODE_PLACEHOLDER, value: 1204 },
    { name: "法学教研室", value: 987 },
    { name: "党史教育中心", value: 856 },
    { name: "语言实践中心", value: 721 },
    { name: "马克思理论教研室", value: 534 },
  ],
};

interface D2VisualizationProps {
  /** 由父组件在画布完全展开后传入，控制首次动画时机 */
  visible: boolean;
  selfNodeName?: string;
}

function D2VisualizationImpl({ visible, selfNodeName }: D2VisualizationProps) {
  const [period, setPeriod] = useState<Period>("本月");
  const [animKey, setAnimKey] = useState(0); // 每次切换时触发重新动画
  const rootRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<(HTMLDivElement | null)[]>([]);
  const labelsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const headerRef = useRef<HTMLElement>(null);
  const prevVisibleRef = useRef(false);

  const resolvedSelfNodeName = selfNodeName?.trim() || "图书馆-法律文献区";
  const data = useMemo(
    () =>
      MOCK_DATA[period].map((item) =>
        item.name === SELF_NODE_PLACEHOLDER ? { ...item, name: resolvedSelfNodeName } : item,
      ),
    [period, resolvedSelfNodeName],
  );
  const maxVal = data[0].value;

  /* ── 动画函数 ── */
  const runAnimation = useCallback(() => {
    const bars = barsRef.current.filter(Boolean) as HTMLDivElement[];
    const labels = labelsRef.current.filter(Boolean) as HTMLSpanElement[];

    if (!bars.length) return;

    // 重置状态
    bars.forEach((bar, i) => {
      const pct = (data[i].value / maxVal) * 88;
      gsap.set(bar, { width: "0%", opacity: 0 });
      gsap.set(bar, { "--bar-target-width": `${pct}%` } as gsap.TweenVars);
    });
    labels.forEach((lbl) => gsap.set(lbl, { autoAlpha: 0 }));

    const tl = gsap.timeline();

    // 瀑布流：五根柱子依次从左向右生长，同时透明度渐显
    bars.forEach((bar, i) => {
      const pct = (data[i].value / maxVal) * 88;
      tl.to(
        bar,
        {
          width: `${pct}%`,
          opacity: 1,
          duration: 0.4,
          ease: "power3.out",
        },
        i * 0.07, // stagger 偏移：级联感
      );
    });

    // 柱体全部生长完毕后，标签顺序浮现
    tl.to(
      labels,
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.3,
        stagger: 0.06,
        ease: "power2.out",
      },
      ">", // 接在柱体之后
    );
  }, [data, maxVal]);

  /* ── 首次：等 visible = true 后才入场，同时处理标题栏 ── */
  useEffect(() => {
    if (!visible) return;
    if (!prevVisibleRef.current) {
      prevVisibleRef.current = true;
      // 标题栏：与 D1 相同时机浮现
      if (headerRef.current) {
        gsap.to(headerRef.current, { autoAlpha: 1, duration: 0.3, ease: "power2.out" });
      }
    }
    runAnimation();
  }, [visible, animKey, runAnimation]);


  /* ── 切换时间段时触发重新动画 ── */
  const handlePeriodChange = (p: Period) => {
    if (p === period) return;
    setPeriod(p);
    setAnimKey((k) => k + 1);
  };

  if (!visible) return null;

  return (
    <div ref={rootRef} className="d2viz-root" aria-label="数据库贡献排行图">

      {/* ── 顶部标题栏，与 D1 结构完全一致 ── */}
      <header ref={headerRef} className="d1tl-header d2viz-header">
        <span className="d1tl-header-dot" />
        <span className="d1tl-header-title">更新贡献排行榜</span>

        {/* 时间段切换器 */}
        <div className="d2viz-period-selector" role="group" aria-label="时间段选择">
          {PERIODS.map((p) => (
            <button
              key={p}
              className={`d2viz-period-btn${p === period ? " d2viz-period-btn--active" : ""}`}
              onClick={() => handlePeriodChange(p)}
              aria-pressed={p === period}
            >
              <span className="d2viz-period-btn-text">{p}</span>
              {p === period && <span className="d2viz-period-btn-bar" />}
            </button>
          ))}
        </div>
      </header>

      {/* ── 柱状图区域 ── */}
      <div className="d2viz-chart-area">
        {data.map((item, i) => (
          <div key={`${period}-${item.name}`} className="d2viz-row">
            {/* 柱体包裹层(决定最大宽度) */}
            <div className="d2viz-bar-track">
              {/* 实际柱体 — GSAP 控制宽度，圆角胶囊右边界 */}
              <div
                ref={(el) => { barsRef.current[i] = el; }}
                className="d2viz-bar"
                style={{ background: BAR_COLORS[i] }}
              />
            </div>

            {/* 节点名称标签 — 柱体右侧 */}
            <span
              ref={(el) => { labelsRef.current[i] = el; }}
              className="d2viz-label"
              style={{ color: BAR_COLORS[i] }}
            >
              {item.name}
              <em className="d2viz-value">{item.value}</em>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export const D2Visualization = memo(D2VisualizationImpl);
