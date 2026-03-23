"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { D1Timeline } from "./components/D1Timeline";
import { D2Visualization } from "./components/D2Visualization";
import { D4Visualization } from "./components/D4Visualization";
import { gsap } from "gsap";
import { StaggeredMenu } from "../main/components/StaggeredMenu";
import type { StaggeredMenuItem } from "../main/components/StaggeredMenu";
import { LINE_DRAW_EASE } from "../shared/animation";
import {
  VW,
  VH,
  MACRO_STROKE_WIDTH,
  MACRO_LINE_INITIAL,
  MACRO_LINE_SETTLED,
  MACRO_BG,
} from "../shared/coords";

/* ─── 坐标常量 ────────────────────────────────────────────── */
// viewBox = 1440 × 900 (same as Window 1 / 3)
const X_LEFT = VW * 0.25;         // 360  – p1 (25%)
const X_RIGHT = VW * 0.75;        // 1080 – p2 (75%)
const Y_MID = VH / 2;             // 450  – p3 / p4

/* ─── 菜单展开时画面整体水平偏移目标（与 Window 3 一致） ─── */
const MENU_SHIFT_PX = 0.15 * VW; // 216

interface MacroWindowProps {
  onBack?: () => void;
  onNavigateToMain?: () => void;
  onOpenDatabase?: () => void;
}

export function MacroWindow({
  onBack,
  onNavigateToMain,
  onOpenDatabase,
}: MacroWindowProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const modulesRef = useRef<HTMLDivElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [d1Visible, setD1Visible] = useState(false);

  // 菜单联动补间
  const menuTweenRef = useRef<gsap.core.Tween | null>(null);
  const entryDoneRef = useRef(false);
  const pendingMenuOpenRef = useRef<boolean | null>(null);

  /* ─── 入场动画 ─────────────────────────────────────────── */
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const modules = modulesRef.current;
    if (!svg) return;

    // Query elements
    const p1 = svg.querySelector<SVGLineElement>("#macro-p1");
    const p2 = svg.querySelector<SVGLineElement>("#macro-p2");
    const p3 = svg.querySelector<SVGLineElement>("#macro-p3");
    const p4 = svg.querySelector<SVGLineElement>("#macro-p4");
    const d1 = svg.querySelector<SVGRectElement>("#macro-d1");
    const d2 = svg.querySelector<SVGRectElement>("#macro-d2");
    const d4 = svg.querySelector<SVGRectElement>("#macro-d4");
    const d5 = svg.querySelector<SVGRectElement>("#macro-d5");

    const allLines = [p1, p2, p3, p4].filter(Boolean) as SVGLineElement[];

    // 初始化线条 dash
    allLines.forEach((line) => {
      const len = line.getTotalLength();
      gsap.set(line, {
        strokeDasharray: len,
        strokeDashoffset: len,
        stroke: MACRO_LINE_INITIAL,
        opacity: 1,
      });
    });

    // 初始化四块白色区域（不可见）
    [d1, d2, d4, d5].filter(Boolean).forEach((rect) => {
      gsap.set(rect!, { fillOpacity: 0 });
    });

    // 模块层初始不可见
    if (modules) gsap.set(modules, { autoAlpha: 0 });

    const tl = gsap.timeline({
      onComplete: () => {
        entryDoneRef.current = true;
        setD1Visible(true);
        // 如果入场期间菜单已打开，补一次偏移
        if (pendingMenuOpenRef.current !== null) {
          const shouldShift = pendingMenuOpenRef.current;
          pendingMenuOpenRef.current = null;
          animateMenuShift(shouldShift);
        }
      },
    });

    /* 阶段 1 (0–0.4s)：p1 ↓  p2 ↑ */
    tl.to([p1, p2].filter(Boolean), {
      strokeDashoffset: 0,
      duration: 0.4,
      ease: LINE_DRAW_EASE,
      stagger: 0,
    }, 0);

    /* 阶段 2 (0.4–0.8s)：p3 ←  p4 → */
    tl.to([p3, p4].filter(Boolean), {
      strokeDashoffset: 0,
      duration: 0.4,
      ease: LINE_DRAW_EASE,
      stagger: 0,
    }, 0.4);

    /* 0.8s 时刻：变色 */
    tl.to(allLines, {
      stroke: MACRO_LINE_SETTLED,
      duration: 0.25,
      ease: "power2.out",
    }, 0.8);

    /* 阶段 3 (0.8–1.2s)：白色区域覆盖 */
    // d1 (左上): 从上往下
    if (d1) {
      tl.fromTo(d1,
        { attr: { y: 0, height: 0 }, fillOpacity: 1 },
        { attr: { height: Y_MID }, duration: 0.4, ease: "power2.inOut" },
        0.8,
      );
    }
    // d4 (右上): 从上往下
    if (d4) {
      tl.fromTo(d4,
        { attr: { y: 0, height: 0 }, fillOpacity: 1 },
        { attr: { height: Y_MID }, duration: 0.4, ease: "power2.inOut" },
        0.8,
      );
    }
    // d2 (左下): 从下往上 — 先设置 y=VH, height=0, 然后同时改 y 和 height
    if (d2) {
      tl.fromTo(d2,
        { attr: { y: VH, height: 0 }, fillOpacity: 1 },
        { attr: { y: Y_MID, height: VH - Y_MID }, duration: 0.4, ease: "power2.inOut" },
        0.8,
      );
    }
    // d5 (右下): 从下往上
    if (d5) {
      tl.fromTo(d5,
        { attr: { y: VH, height: 0 }, fillOpacity: 1 },
        { attr: { y: Y_MID, height: VH - Y_MID }, duration: 0.4, ease: "power2.inOut" },
        0.8,
      );
    }

    /* 阶段 4 (1.2–1.6s)：功能模块淡入 */
    if (modules) {
      tl.to(modules, {
        autoAlpha: 1,
        duration: 0.4,
        ease: "power2.out",
      }, 1.2);
    }

    return () => { tl.kill(); };
  }, []);

  /* ─── 菜单联动偏移 ─────────────────────────────────────── */
  const animateMenuShift = useCallback((open: boolean) => {
    const svg = svgRef.current;
    const modules = modulesRef.current;
    if (!svg) return;

    menuTweenRef.current?.kill();
    const targetX = open ? -MENU_SHIFT_PX : 0;

    menuTweenRef.current = gsap.to([svg, modules].filter(Boolean), {
      x: targetX,
      duration: 0.45,
      ease: "power3.inOut",
    });
  }, []);

  useEffect(() => {
    if (!entryDoneRef.current) {
      pendingMenuOpenRef.current = isMenuOpen;
      return;
    }
    animateMenuShift(isMenuOpen);
    return () => { menuTweenRef.current?.kill(); };
  }, [isMenuOpen, animateMenuShift]);

  /* ─── 菜单配置 ─────────────────────────────────────────── */
  const menuItems: StaggeredMenuItem[] = [
    { label: "返回初始界面", ariaLabel: "返回初始界面", link: "#", onClick: onBack },
    { label: "交互对话",     ariaLabel: "交互对话",     link: "#", onClick: onNavigateToMain },
    { label: "数据库",       ariaLabel: "数据库",       link: "#", onClick: onOpenDatabase },
    { label: "宏观平台",     ariaLabel: "宏观平台",     link: "#" },
  ];

  return (
    <div className="macro-window-page">

      {/* ── SVG 画布层 ──────────────────────────────────────── */}
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid slice"
        className="macro-svg-canvas"
        aria-hidden="true"
      >
        {/* 四块白色填充区域 — 渲染在线条之下 */}
        {/* d1: 左上 (0,0) → (X_LEFT, Y_MID) */}
        <rect id="macro-d1" x={0} y={0} width={X_LEFT} height={Y_MID} fill="#ffffff" fillOpacity={0} />
        {/* d2: 左下 (0, Y_MID) → (X_LEFT, VH) */}
        <rect id="macro-d2" x={0} y={Y_MID} width={X_LEFT} height={VH - Y_MID} fill="#ffffff" fillOpacity={0} />
        {/* d4: 右上 (X_RIGHT, 0) → (VW, Y_MID) */}
        <rect id="macro-d4" x={X_RIGHT} y={0} width={VW - X_RIGHT} height={Y_MID} fill="#ffffff" fillOpacity={0} />
        {/* d5: 右下 (X_RIGHT, Y_MID) → (VW, VH) */}
        <rect id="macro-d5" x={X_RIGHT} y={Y_MID} width={VW - X_RIGHT} height={VH - Y_MID} fill="#ffffff" fillOpacity={0} />

        {/* p1: 左边界竖线，从上→下 */}
        <line
          id="macro-p1"
          x1={X_LEFT} y1={0}
          x2={X_LEFT} y2={VH}
          stroke={MACRO_LINE_INITIAL}
          strokeWidth={MACRO_STROKE_WIDTH}
        />
        {/* p2: 右边界竖线，从下→上 (path direction reversed via strokeDashoffset) */}
        <line
          id="macro-p2"
          x1={X_RIGHT} y1={VH}
          x2={X_RIGHT} y2={0}
          stroke={MACRO_LINE_INITIAL}
          strokeWidth={MACRO_STROKE_WIDTH}
        />
        {/* p3: 左区中轴横线，从 p1 向左 */}
        <line
          id="macro-p3"
          x1={X_LEFT}  y1={Y_MID}
          x2={0}       y2={Y_MID}
          stroke={MACRO_LINE_INITIAL}
          strokeWidth={MACRO_STROKE_WIDTH}
        />
        {/* p4: 右区中轴横线，从 p2 向右 */}
        <line
          id="macro-p4"
          x1={X_RIGHT} y1={Y_MID}
          x2={VW}      y2={Y_MID}
          stroke={MACRO_LINE_INITIAL}
          strokeWidth={MACRO_STROKE_WIDTH}
        />
      </svg>

      {/* ── 功能模块层（1.2s 后淡入） ────────────────────────── */}
      <div ref={modulesRef} className="macro-modules-layer">
        {/* d1 区 — 左上 */}
        <section className="macro-zone macro-zone--d1">
          <D1Timeline visible={d1Visible} />
        </section>
        {/* d2 区 — 左下 */}
        <section className="macro-zone macro-zone--d2">
          <D2Visualization visible={d1Visible} />
        </section>
        {/* d3 区 — 中间大片（暗色） */}
        <section className="macro-zone macro-zone--d3">
          <span className="macro-zone-label">D3 · 核心区域</span>
        </section>
        {/* d4 区 — 右上 */}
        <section className="macro-zone macro-zone--d4">
          <D4Visualization visible={d1Visible} />
        </section>
        {/* d5 区 — 右下 */}
        <section className="macro-zone macro-zone--d5">
          <span className="macro-zone-label">D5 · 待定模块</span>
        </section>
      </div>

      {/* ── 菜单层（始终最上层） ─────────────────────────────── */}
      <div className="macro-menu-layer sm-scope">
        <StaggeredMenu
          position="right"
          items={menuItems}
          displayItemNumbering={true}
          menuButtonColor="#111111"
          openMenuButtonColor="#111111"
          changeMenuColorOnOpen={false}
          colors={["#D8B4FE", "#A855F7"]}
          accentColor="#A855F7"
          onMenuOpen={() => setIsMenuOpen(true)}
          onMenuClose={() => setIsMenuOpen(false)}
        />
      </div>
    </div>
  );
}
