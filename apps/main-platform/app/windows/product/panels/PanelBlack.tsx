"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import {
  CHAT_W,
  CHAT_H,
  CHAT_BLUE,
  CHAT_BG,
  CHAT_V1,
  CHAT_V2,
  CHAT_V3,
  CHAT_L1,
  CHAT_L2,
  CHAT_L3,
  CHAT_L4,
  CHAT_GREEN_START_X,
  CHAT_X_MID,
  CHAT_Y_MID,
  CHAT_TITLE_TOP_EXPAND,
  CHAT_TITLE_FO_Y,
  CHAT_TITLE_FO_HEIGHT,
  CHAT_TITLE_MASK_Y,
  CHAT_TITLE_MASK_HEIGHT,
  CHAT_QUOTE_TL_X,
  CHAT_QUOTE_TL_Y,
  CHAT_QUOTE_BR_X,
  CHAT_QUOTE_BR_Y,
  CHAT_QUOTE_SCALE,
} from "../../shared/coords";
import { CHAT_LINE_EASE } from "../../shared/animation";

interface PanelBlackProps {
  onBack: () => void;
}

export function PanelBlack({ onBack }: PanelBlackProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const q = gsap.utils.selector(svg);
    const chars = q(".chat-title-char");
    const lines = q(".chat-grid-line");
    const hL1 = svg.querySelector<SVGLineElement>("#chat-l1");
    const hL2 = svg.querySelector<SVGLineElement>("#chat-l2");
    const hL3 = svg.querySelector<SVGLineElement>("#chat-l3");
    const hL4 = svg.querySelector<SVGLineElement>("#chat-l4");
    const v1 = svg.querySelector<SVGLineElement>("#chat-v1");
    const v2 = svg.querySelector<SVGLineElement>("#chat-v2");
    const v3 = svg.querySelector<SVGLineElement>("#chat-v3");
    const yellowReveal = svg.querySelector<SVGRectElement>("#chat-yellow-reveal-rect");
    const greenReveal = svg.querySelector<SVGRectElement>("#chat-green-reveal-rect");
    const backBtn = svg.querySelector<SVGForeignObjectElement>("#chat-back-button-fo");
    const topQuotePanel = q(".chat-quote-panel-top.chat-quote-panel-anim");
    const bottomQuotePanel = q(".chat-quote-panel-bottom.chat-quote-panel-anim");
    const cornerQuotes = q(".chat-corner-quote-anim");

    gsap.set(chars, { yPercent: 112, opacity: 0 });
    gsap.set(topQuotePanel, { autoAlpha: 0, yPercent: 8, scale: 0.98, transformOrigin: "50% 50%" });
    gsap.set(bottomQuotePanel, { autoAlpha: 0, yPercent: 8, scale: 0.98, transformOrigin: "50% 50%" });
    gsap.set(cornerQuotes, { autoAlpha: 0, yPercent: 14, scale: 0.82, transformOrigin: "50% 50%" });
    gsap.set(lines, { stroke: "#ffffff", strokeWidth: 1, strokeOpacity: 1, shapeRendering: "crispEdges", filter: "none" });

    const tl = gsap.timeline({
      onStart: () => {
        gsap.set(lines, { shapeRendering: "geometricPrecision" });
      },
      onComplete: () => {
        gsap.set(lines, { shapeRendering: "crispEdges" });
      },
    });

    tl.to(chars, { yPercent: 0, opacity: 1, duration: 0.62, ease: "power3.out", stagger: 0.03 }, 0.08);

    tl.to(hL2, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.22);
    tl.to(hL3, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.30);
    tl.to(hL1, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.40);
    tl.to(hL4, { attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W }, duration: 0.52, ease: CHAT_LINE_EASE }, 0.52);

    tl.to(v2, { attr: { y1: 0, y2: CHAT_H }, duration: 0.46, ease: CHAT_LINE_EASE }, 0.60);
    tl.to(v3, { attr: { y1: 0, y2: CHAT_H }, duration: 0.46, ease: CHAT_LINE_EASE }, 0.68);
    tl.to(v1, { attr: { y1: 0, y2: CHAT_H }, duration: 0.46, ease: CHAT_LINE_EASE }, 0.78);

    tl.to(lines, {
      stroke: CHAT_BLUE,
      strokeWidth: 1,
      strokeOpacity: 0.3,
      duration: 0.8,
      ease: "sine.inOut",
    }, 0.92);

    if (yellowReveal) {
      tl.to(yellowReveal, { attr: { width: CHAT_W - CHAT_V3 + 64 }, duration: 0.54, ease: "power3.out" }, 1.0);
    }
    if (greenReveal) {
      tl.to(greenReveal, { attr: { y: CHAT_L4 - 48, height: CHAT_H - CHAT_L4 + 48 }, duration: 0.56, ease: "power3.out" }, 1.08);
    }

    tl.to(topQuotePanel, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.36, ease: "power2.out" }, 1.06);
    tl.to(bottomQuotePanel, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.36, ease: "power2.out" }, 1.14);
    tl.to(cornerQuotes, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.42, ease: "back.out(1.9)", stagger: 0.12 }, 1.1);

    if (backBtn) {
      tl.fromTo(backBtn,
        { scale: 0.88, transformOrigin: "28px 540px" },
        { scale: 1, duration: 0.24, ease: "back.out(2)" },
        1.15,
      );
    }

    return () => { tl.kill(); };
  }, []);

  const title = "LightRAG";

  return (
    <main className="chat-window-page">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${CHAT_W} ${CHAT_H}`}
        preserveAspectRatio="xMidYMid slice"
        className="chat-window-canvas"
      >
        <defs>
          <mask id="chat-yellow-mask">
            <rect x={CHAT_V3} y={0} width={CHAT_W - CHAT_V3} height={CHAT_L1} fill="black" />
            <rect
              id="chat-yellow-reveal-rect"
              x={CHAT_V3}
              y={0}
              width={0}
              height={CHAT_L1}
              fill="url(#chat-mask-gradient-x)"
            />
          </mask>
          <mask id="chat-green-mask">
            <rect x={CHAT_GREEN_START_X} y={CHAT_L4} width={CHAT_V3 - CHAT_GREEN_START_X} height={CHAT_H - CHAT_L4} fill="black" />
            <rect
              id="chat-green-reveal-rect"
              x={CHAT_GREEN_START_X}
              y={CHAT_H}
              width={CHAT_V3 - CHAT_GREEN_START_X}
              height={0}
              fill="url(#chat-mask-gradient-y)"
            />
          </mask>
          <linearGradient id="chat-mask-gradient-x" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="white" />
            <stop offset="86%" stopColor="white" />
            <stop offset="100%" stopColor="black" />
          </linearGradient>
          <linearGradient id="chat-mask-gradient-y" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="black" />
            <stop offset="12%" stopColor="white" />
            <stop offset="100%" stopColor="white" />
          </linearGradient>
          <clipPath id="chat-title-mask">
            <rect x={CHAT_V2} y={CHAT_TITLE_MASK_Y} width={CHAT_V3 - CHAT_V2} height={CHAT_TITLE_MASK_HEIGHT} />
          </clipPath>
        </defs>

        <rect x={0} y={0} width={CHAT_W} height={CHAT_H} fill={CHAT_BG} />

        <rect
          x={CHAT_V3} y={0}
          width={CHAT_W - CHAT_V3} height={CHAT_L1}
          fill="#F7D147"
          mask="url(#chat-yellow-mask)"
        />
        <rect
          x={CHAT_GREEN_START_X} y={CHAT_L4}
          width={CHAT_V3 - CHAT_GREEN_START_X} height={CHAT_H - CHAT_L4}
          fill="#164D33"
          mask="url(#chat-green-mask)"
        />

        <line id="chat-l1" className="chat-grid-line" x1={CHAT_X_MID} y1={CHAT_L1 + 0.5} x2={CHAT_X_MID} y2={CHAT_L1 + 0.5} />
        <line id="chat-l2" className="chat-grid-line" x1={CHAT_X_MID} y1={CHAT_L2 + 0.5} x2={CHAT_X_MID} y2={CHAT_L2 + 0.5} />
        <line id="chat-l3" className="chat-grid-line" x1={CHAT_X_MID} y1={CHAT_L3 + 0.5} x2={CHAT_X_MID} y2={CHAT_L3 + 0.5} />
        <line id="chat-l4" className="chat-grid-line" x1={CHAT_X_MID} y1={CHAT_L4 + 0.5} x2={CHAT_X_MID} y2={CHAT_L4 + 0.5} />

        <line id="chat-v1" className="chat-grid-line" x1={CHAT_V1 + 0.5} y1={CHAT_Y_MID} x2={CHAT_V1 + 0.5} y2={CHAT_Y_MID} />
        <line id="chat-v2" className="chat-grid-line" x1={CHAT_V2 + 0.5} y1={CHAT_Y_MID} x2={CHAT_V2 + 0.5} y2={CHAT_Y_MID} />
        <line id="chat-v3" className="chat-grid-line" x1={CHAT_V3 + 0.5} y1={CHAT_Y_MID} x2={CHAT_V3 + 0.5} y2={CHAT_Y_MID} />

        <text transform={`translate(24 ${CHAT_H - 80}) rotate(-90)`} className="chat-side-label">
          Partner Info
        </text>

        <foreignObject x={CHAT_V3} y={0} width={CHAT_W - CHAT_V3} height={CHAT_L1} xmlns="http://www.w3.org/1999/xhtml">
          <div className="chat-quote-panel chat-quote-panel-top chat-quote-panel-anim">
            <p className="chat-quote-open">{"\u275B\u200A\u275B"}</p>
            <p>Go from idea to done</p>
            <p>with Dropbox.</p>
            <p className="chat-quote-close">{"\u00A0".repeat(36) + "\u275C\u200A\u275C"}</p>
          </div>
        </foreignObject>

        <foreignObject x={CHAT_GREEN_START_X} y={CHAT_L4} width={CHAT_V3 - CHAT_GREEN_START_X} height={CHAT_H - CHAT_L4} xmlns="http://www.w3.org/1999/xhtml">
          <div className="chat-quote-panel chat-quote-panel-bottom chat-quote-panel-anim">
            <p className="chat-quote-open">{"\u275B\u200A\u275B"}</p>
            <p>These are not just your</p>
            <p>files. They are pieces</p>
            <p>of your life.</p>
            <p className="chat-quote-close">{"\u00A0".repeat(36) + "\u275C\u200A\u275C"}</p>
          </div>
        </foreignObject>

        <g
          id="chat-quote-tl"
          className="chat-corner-quote chat-corner-quote-tl"
          transform={`translate(${CHAT_QUOTE_TL_X} ${CHAT_QUOTE_TL_Y}) scale(${CHAT_QUOTE_SCALE})`}
        >
          <g className="chat-corner-quote-anim">
            <text className="chat-corner-quote-glyph">{`\u275b\u275b`}</text>
          </g>
        </g>
        <g
          id="chat-quote-br"
          className="chat-corner-quote chat-corner-quote-br"
          transform={`translate(${CHAT_QUOTE_BR_X} ${CHAT_QUOTE_BR_Y}) scale(${CHAT_QUOTE_SCALE})`}
        >
          <g className="chat-corner-quote-anim">
            <text className="chat-corner-quote-glyph">{`\u275c\u275c`}</text>
          </g>
        </g>

        <g clipPath="url(#chat-title-mask)">
          <foreignObject
            x={CHAT_V2}
            y={CHAT_TITLE_FO_Y}
            width={CHAT_V3 - CHAT_V2}
            height={CHAT_TITLE_FO_HEIGHT}
            xmlns="http://www.w3.org/1999/xhtml"
          >
            <div className="chat-title-fo-root" style={{ paddingTop: `${CHAT_TITLE_TOP_EXPAND}px` }}>
              <div className="chat-title-wrap">
                {title.split("").map((char, idx) => (
                  <span key={`chat-char-${idx}`} className="chat-title-char">
                    {char === " " ? "\u00A0" : char}
                  </span>
                ))}
              </div>
            </div>
          </foreignObject>
        </g>

        <foreignObject id="chat-back-button-fo" x={0} y={508} width={64} height={64} xmlns="http://www.w3.org/1999/xhtml">
          <div className="chat-back-btn-root">
            <button type="button" className="chat-pushable" aria-label="Back to login" onClick={onBack}>
              <span className="chat-shadow" />
              <span className="chat-edge" />
              <span className="chat-front">
                <svg viewBox="0 0 20 20" className="chat-back-btn-icon" aria-hidden="true">
                  <path d="M16 5.5H10V14.5H16" />
                  <path d="M13 10H4.5" />
                  <path d="M7.6 7 L4.5 10 L7.6 13" />
                </svg>
              </span>
            </button>
          </div>
        </foreignObject>
      </svg>
    </main>
  );
}
