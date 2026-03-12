"use client";

// ─────────────────────────────────────────────────────────────
// Panel 3 · 蓝色延展板块
// 画布层级：z-index 0 WebGL（Threads），z-index 1 SVG 四横线（GSAP），与 README 规范一致
// ─────────────────────────────────────────────────────────────

import { useLayoutEffect, useRef } from "react";
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

interface PanelBlueExtendProps {
  isActive?: boolean;
}

export function PanelBlueExtend({ isActive = false }: PanelBlueExtendProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !isActive) return;

    const lines = svg.querySelectorAll(".p3-grid-line");
    const v1 = svg.querySelector<SVGLineElement>("#p3-v1");
    const hL1 = svg.querySelector<SVGLineElement>("#p3-l1");
    const hL2 = svg.querySelector<SVGLineElement>("#p3-l2");
    const hL3 = svg.querySelector<SVGLineElement>("#p3-l3");
    const hL4 = svg.querySelector<SVGLineElement>("#p3-l4");

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

    // 左侧竖线（与 Panel1/2 一致）：从中心向上下生长
    tl.to(v1, { attr: { y1: 0, y2: CHAT_H }, duration: 0.46, ease: CHAT_LINE_EASE }, 0.0);
    // README：L2 → L3 → L1 → L4 顺序，中心向两端生长
    tl.to(hL2, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.0);
    tl.to(hL3, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.08);
    tl.to(hL1, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.18);
    tl.to(hL4, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.28);
    tl.to(
      lines,
      {
        stroke: CHAT_BLUE,
        strokeWidth: 1,
        strokeOpacity: 0.3,
        duration: 0.8,
        ease: "sine.inOut",
      },
      0.38
    );

    return () => {
      tl.kill();
    };
  }, [isActive]);

  return (
    <div className="panel-blue-extend">
      <div className="panel-blue-extend-canvas">
        <ThreadsEffect
          gradientColors={THREADS_GRADIENT}
          amplitude={1}
          distance={0}
          enableMouseInteraction={false}
          verticalOffset={0.22}
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
    </div>
  );
}
