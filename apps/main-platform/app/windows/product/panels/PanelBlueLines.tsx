"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import {
  CHAT_BLUE,
  CHAT_H,
  CHAT_W,
  CHAT_QUOTE_BR_X,
  CHAT_QUOTE_SCALE,
  CHAT_QUOTE_TL_X,
  CHAT_QUOTE_TL_Y,
  P2_AUX_H_Y,
  P2_BOTTOM,
  P2_LEFT,
  P2_QUOTE_BR_Y,
  P2_RIGHT,
  P2_TOP,
  P2_V1,
} from "../../shared/coords";
import { CHAT_LINE_EASE } from "../../shared/animation";

interface PanelBlueLinesProps {
  isActive: boolean;
}

export function PanelBlueLines({ isActive }: PanelBlueLinesProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg || !isActive) return;

    const SHIFT = 0.5;
    const q = gsap.utils.selector(svg);
    const lines = q(".p2-grid-line");
    const cornerQuotes = q(".chat-corner-quote-anim");

    const v1 = svg.querySelector<SVGLineElement>("#p2-v1");
    const top = svg.querySelector<SVGLineElement>("#p2-top");
    const bottom = svg.querySelector<SVGLineElement>("#p2-bottom");
    const left = svg.querySelector<SVGLineElement>("#p2-left");
    const right = svg.querySelector<SVGLineElement>("#p2-right");
    const auxH = svg.querySelector<SVGLineElement>("#p2-aux-h");

    const xLeft = P2_V1 + 0.5;
    const yStageMid = CHAT_H / 2;

    // Initial collapsed states (no background rect; lines only).
    if (v1) gsap.set(v1, { attr: { y1: yStageMid, y2: yStageMid } });
    if (top) gsap.set(top, { attr: { x1: xLeft, x2: xLeft } });
    if (bottom) gsap.set(bottom, { attr: { x1: xLeft, x2: xLeft } });
    if (auxH) gsap.set(auxH, { attr: { x1: xLeft, x2: xLeft } });
    if (left) gsap.set(left, { attr: { y1: yStageMid, y2: yStageMid } });
    if (right) gsap.set(right, { attr: { y1: yStageMid, y2: yStageMid } });

    gsap.set(lines, {
      stroke: "#ffffff",
      strokeWidth: 1,
      strokeOpacity: 1,
      shapeRendering: "crispEdges",
      vectorEffect: "non-scaling-stroke",
      fill: "none",
      filter: "none",
    });

    gsap.set(cornerQuotes, { autoAlpha: 0, yPercent: 14, scale: 0.82, transformOrigin: "50% 50%" });

    const tl = gsap.timeline({
      onStart: () => {
        gsap.set(lines, { shapeRendering: "geometricPrecision" });
      },
      onComplete: () => {
        gsap.set(lines, { shapeRendering: "crispEdges" });
      },
    });

    // Order: v1 → top → bottom → left → right → auxH → tone shift.
    tl.to(v1, { attr: { y1: 0, y2: CHAT_H }, duration: 0.46, ease: CHAT_LINE_EASE }, 0.0 + SHIFT);
    tl.to(top, { attr: { x1: xLeft, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.12 + SHIFT);
    tl.to(bottom, { attr: { x1: xLeft, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.22 + SHIFT);
    tl.to(left, { attr: { y1: 0, y2: CHAT_H }, duration: 0.46, ease: CHAT_LINE_EASE }, 0.32 + SHIFT);
    tl.to(right, { attr: { y1: 0, y2: CHAT_H }, duration: 0.46, ease: CHAT_LINE_EASE }, 0.42 + SHIFT);
    tl.to(auxH, { attr: { x1: xLeft, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.52 + SHIFT);
    tl.to(cornerQuotes, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.42, ease: "back.out(1.9)", stagger: 0.12 }, 0.62 + SHIFT);

    tl.to(
      lines,
      {
        stroke: CHAT_BLUE,
        strokeWidth: 1,
        strokeOpacity: 0.3,
        duration: 0.8,
        ease: "sine.inOut",
      },
      0.7 + SHIFT,
    );

    return () => {
      tl.kill();
    };
  }, [isActive]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${CHAT_W} ${CHAT_H}`}
      preserveAspectRatio="xMidYMid slice"
      className="panel-blue-main-lines-canvas"
      aria-hidden="true"
    >
      <line id="p2-v1" className="p2-grid-line" x1={P2_V1 + 0.5} y1={CHAT_H / 2} x2={P2_V1 + 0.5} y2={CHAT_H / 2} />

      <line id="p2-top" className="p2-grid-line" x1={P2_V1 + 0.5} y1={P2_TOP + 0.5} x2={P2_V1 + 0.5} y2={P2_TOP + 0.5} />
      <line
        id="p2-bottom"
        className="p2-grid-line"
        x1={P2_V1 + 0.5}
        y1={P2_BOTTOM + 0.5}
        x2={P2_V1 + 0.5}
        y2={P2_BOTTOM + 0.5}
      />

      <line id="p2-left" className="p2-grid-line" x1={P2_LEFT + 0.5} y1={(P2_TOP + P2_BOTTOM) / 2} x2={P2_LEFT + 0.5} y2={(P2_TOP + P2_BOTTOM) / 2} />
      <line
        id="p2-right"
        className="p2-grid-line"
        x1={P2_RIGHT + 0.5}
        y1={(P2_TOP + P2_BOTTOM) / 2}
        x2={P2_RIGHT + 0.5}
        y2={(P2_TOP + P2_BOTTOM) / 2}
      />

      <line id="p2-aux-h" className="p2-grid-line" x1={P2_V1 + 0.5} y1={P2_AUX_H_Y + 0.5} x2={P2_V1 + 0.5} y2={P2_AUX_H_Y + 0.5} />

      <g
        id="p2-quote-tl"
        className="chat-corner-quote chat-corner-quote-tl"
        transform={`translate(${CHAT_QUOTE_TL_X} ${CHAT_QUOTE_TL_Y}) scale(${CHAT_QUOTE_SCALE})`}
      >
        <g className="chat-corner-quote-anim">
          <text className="chat-corner-quote-glyph">{`\u275b\u275b`}</text>
        </g>
      </g>
      <g
        id="p2-quote-br"
        className="chat-corner-quote chat-corner-quote-br"
        transform={`translate(${CHAT_QUOTE_BR_X} ${P2_QUOTE_BR_Y}) scale(${CHAT_QUOTE_SCALE})`}
      >
        <g className="chat-corner-quote-anim">
          <text className="chat-corner-quote-glyph">{`\u275c\u275c`}</text>
        </g>
      </g>
    </svg>
  );
}

