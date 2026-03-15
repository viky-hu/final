"use client";

// ─────────────────────────────────────────────────────────────
// Panel 3 · 蓝色延展板块
// 画布层级：z-index 0 WebGL（Threads），z-index 1 SVG 四横线（GSAP），与 README 规范一致
// ─────────────────────────────────────────────────────────────

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  CHAT_BLUE,
  CHAT_W,
  CHAT_H,
  CHAT_V1,
  CHAT_X_MID,
  CHAT_Y_MID,
  P3_L1,
  P3_L2,
  P3_L3,
  P3_L4,
} from "../../shared/coords";
import { CHAT_LINE_EASE } from "../../shared/animation";
import { ThreadsEffect, THREADS_GRADIENT } from "../ThreadsEffect";
import { Crosshair } from "../overlays/Crosshair";

interface PanelBlueExtendProps {
  isActive?: boolean;
  /**
   * 软退出阶段：panel 已切走但尚未完全停止渲染。
   * 此时 ThreadsEffect 降帧+振幅衰减，SVG 线条做淡出，过渡自然不突兀。
   */
  shouldSoftStop?: boolean;
  /** Shoot!!! 被点击后的回调，用于切入第三窗口 */
  onShoot?: () => void;
}

const FORCE_ACTIVE_MS = 500;
const PARAM_LERP_MS = 500;
const ACTIVE_DISTANCE = 0;
const INACTIVE_DISTANCE = -0.18;
const ACTIVE_VERTICAL_OFFSET = 0.22;
const INACTIVE_VERTICAL_OFFSET = 0.3;
// 时间轴整体右移 0.5s，切到 panel3 后再播线条动画
const P3_DELAY = 0.5;
const INACTIVE_GRADIENT: [[number, number, number], [number, number, number], [number, number, number]] = [
  [126 / 255, 132 / 255, 206 / 255],
  [84 / 255, 97 / 255, 186 / 255],
  [53 / 255, 69 / 255, 153 / 255],
];

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;
const lerpColor = (
  from: [number, number, number],
  to: [number, number, number],
  t: number
): [number, number, number] => [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
const lerpGradient = (
  from: [[number, number, number], [number, number, number], [number, number, number]],
  to: [[number, number, number], [number, number, number], [number, number, number]],
  t: number
): [[number, number, number], [number, number, number], [number, number, number]] => [
  lerpColor(from[0], to[0], t),
  lerpColor(from[1], to[1], t),
  lerpColor(from[2], to[2], t),
];

export function PanelBlueExtend({
  isActive = false,
  shouldSoftStop = false,
  onShoot,
}: PanelBlueExtendProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const activeLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef(isActive ? 1 : 0);
  const [forceActive, setForceActive] = useState(false);
  const [progress, setProgress] = useState(progressRef.current);
  const [isAimed, setIsAimed] = useState(false);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeLockTimerRef.current) {
      clearTimeout(activeLockTimerRef.current);
      activeLockTimerRef.current = null;
    }
    if (!isActive) {
      setForceActive(false);
      return;
    }
    setForceActive(true);
    activeLockTimerRef.current = setTimeout(() => {
      setForceActive(false);
      activeLockTimerRef.current = null;
    }, FORCE_ACTIVE_MS);
    return () => {
      if (activeLockTimerRef.current) {
        clearTimeout(activeLockTimerRef.current);
        activeLockTimerRef.current = null;
      }
    };
  }, [isActive]);

  useEffect(() => {
    const tweenState = { value: progressRef.current };
    const target = isActive ? 1 : 0;
    const tween = gsap.to(tweenState, {
      value: target,
      duration: PARAM_LERP_MS / 1000,
      ease: "sine.inOut",
      onUpdate: () => {
        progressRef.current = tweenState.value;
        setProgress(tweenState.value);
      },
      onComplete: () => {
        progressRef.current = target;
      },
    });
    return () => {
      tween.kill();
    };
  }, [isActive]);

  // 进入动画（isActive 变为 true 时触发）
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !isActive) return;

    const lines = svg.querySelectorAll(".p3-grid-line");
    const v1 = svg.querySelector<SVGLineElement>("#p3-v1");
    const hL1 = svg.querySelector<SVGLineElement>("#p3-l1");
    const hL2 = svg.querySelector<SVGLineElement>("#p3-l2");
    const hL3 = svg.querySelector<SVGLineElement>("#p3-l3");
    const hL4 = svg.querySelector<SVGLineElement>("#p3-l4");

    // 取消可能残留的软退出淡出
    gsap.killTweensOf(lines);
    if (v1) gsap.killTweensOf(v1);

    if (v1) {
      gsap.set(v1, { attr: { y1: CHAT_Y_MID, y2: CHAT_Y_MID } });
      gsap.set(v1, {
        stroke: "#ffffff",
        strokeWidth: 1,
        strokeOpacity: 1,
        shapeRendering: "crispEdges",
        vectorEffect: "non-scaling-stroke",
        fill: "none",
        filter: "none",
      });
    }

    // 每次进入都把四条横线几何重置到「从中点开始」的初始状态，避免二次进入时已是完全展开状态
    if (hL1) {
      gsap.set(hL1, { attr: { x1: CHAT_X_MID, x2: CHAT_X_MID } });
    }
    if (hL2) {
      gsap.set(hL2, { attr: { x1: CHAT_X_MID, x2: CHAT_X_MID } });
    }
    if (hL3) {
      gsap.set(hL3, { attr: { x1: CHAT_X_MID, x2: CHAT_X_MID } });
    }
    if (hL4) {
      gsap.set(hL4, { attr: { x1: CHAT_X_MID, x2: CHAT_X_MID } });
    }

    gsap.set(lines, {
      stroke: "#ffffff",
      strokeWidth: 1,
      strokeOpacity: 1,
      shapeRendering: "crispEdges",
      vectorEffect: "non-scaling-stroke",
      fill: "none",
      filter: "none",
    });

    const tl = gsap.timeline({
      onStart: () => {
        gsap.set(lines, { shapeRendering: "geometricPrecision" });
        if (v1) gsap.set(v1, { shapeRendering: "geometricPrecision" });
      },
      onComplete: () => {
        gsap.set(lines, { shapeRendering: "crispEdges" });
        if (v1) gsap.set(v1, { shapeRendering: "crispEdges" });
      },
    });

    // 时间轴整体右移 P3_DELAY，切到 panel3 后再播线条动画
    // 左侧竖线（与 Panel1/2 一致）：从中心向上下生长
    tl.to(v1, { attr: { y1: 0, y2: CHAT_H }, duration: 0.46, ease: CHAT_LINE_EASE }, P3_DELAY + 0.0);
    // README：L2 → L3 → L1 → L4 顺序，中心向两端生长
    tl.to(hL2, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, P3_DELAY + 0.0);
    tl.to(hL3, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, P3_DELAY + 0.08);
    tl.to(hL1, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, P3_DELAY + 0.18);
    tl.to(hL4, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, P3_DELAY + 0.28);
    tl.to(
      lines,
      {
        stroke: CHAT_BLUE,
        strokeWidth: 1,
        strokeOpacity: 0.3,
        duration: 0.8,
        ease: "sine.inOut",
      },
      P3_DELAY + 0.38
    );

    return () => {
      tl.kill();
    };
  }, [isActive]);

  // 软退出动画：isActive=false 且 shouldSoftStop=true 时，SVG 线条淡出
  useLayoutEffect(() => {
    if (isActive || !shouldSoftStop) return;
    const svg = svgRef.current;
    if (!svg) return;

    const lines = svg.querySelectorAll(".p3-grid-line");
    gsap.killTweensOf(lines);
    gsap.to(lines, { strokeOpacity: 0, duration: 0.35, ease: "sine.in" });

    return () => {
      gsap.killTweensOf(lines);
    };
  }, [isActive, shouldSoftStop]);

  // active → 全速；软退出中 → 降帧+振幅衰减；完全离开 → 停渲染
  const threadsMode = isActive || forceActive ? "active" : shouldSoftStop ? "idle" : "off";
  const interpolatedDistance = lerp(INACTIVE_DISTANCE, ACTIVE_DISTANCE, progress);
  const interpolatedVerticalOffset = lerp(INACTIVE_VERTICAL_OFFSET, ACTIVE_VERTICAL_OFFSET, progress);
  const interpolatedGradient = lerpGradient(INACTIVE_GRADIENT, THREADS_GRADIENT, progress);

  return (
    <div className="panel-blue-extend">
      <div className="panel-blue-extend-canvas">
        <ThreadsEffect
          gradientColors={interpolatedGradient}
          amplitude={1}
          distance={interpolatedDistance}
          enableMouseInteraction={false}
          verticalOffset={interpolatedVerticalOffset}
          mode={threadsMode}
        />
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHAT_W} ${CHAT_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="panel-blue-extend-lines-canvas"
        aria-hidden="true"
      >
        <line id="p3-v1" className="p3-grid-line" x1={CHAT_V1 + 0.5} y1={CHAT_Y_MID} x2={CHAT_V1 + 0.5} y2={CHAT_Y_MID} />
        <line id="p3-l1" className="p3-grid-line" x1={CHAT_X_MID} y1={P3_L1 + 0.5} x2={CHAT_X_MID} y2={P3_L1 + 0.5} />
        <line id="p3-l2" className="p3-grid-line" x1={CHAT_X_MID} y1={P3_L2 + 0.5} x2={CHAT_X_MID} y2={P3_L2 + 0.5} />
        <line id="p3-l3" className="p3-grid-line" x1={CHAT_X_MID} y1={P3_L3 + 0.5} x2={CHAT_X_MID} y2={P3_L3 + 0.5} />
        <line id="p3-l4" className="p3-grid-line" x1={CHAT_X_MID} y1={P3_L4 + 0.5} x2={CHAT_X_MID} y2={P3_L4 + 0.5} />
      </svg>
      {/* z-index 2：Aim/Shoot 文案 + Crosshair 交互层 */}
      <div ref={setContainerEl} className="panel-blue-extend-interact">
        <div className="p3-aim-shoot-wrap">
          <a
            className={`p3-aim-shoot-text${isAimed ? " is-aimed" : ""}`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              onShoot?.();
            }}
            onMouseEnter={() => setIsAimed(true)}
            onMouseLeave={() => setIsAimed(false)}
          >
            {isAimed ? "链接启动" : "点此开启链接"}
          </a>
        </div>
        <Crosshair containerRef={containerEl} color="#ffffff" />
      </div>
    </div>
  );
}
