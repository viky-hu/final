"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { BeamsBackground } from "./beams-background";

const BRAND_BLUE = "#3152f4";
const GRID_COLOR = "rgba(49, 82, 244, 0.12)";
const VW = 1440;
const VH = 900;
const PHASE1_STROKE = 1.5;
gsap.registerPlugin(CustomEase);

// Single-curve slow-fast-slow profile to avoid segmented velocity jumps.
const LINE_DRAW_EASE = CustomEase.create(
  "line-draw-ease",
  "M0,0 C0.08,0 0.14,0.02 0.2,0.1 0.32,0.24 0.42,0.8 0.6,0.9 0.76,0.96 0.88,0.99 1,1",
);

const LOGO_DRAW_EASE = CustomEase.create(
  "logo-draw-ease",
  "M0,0 C0.1,0.005 0.18,0.03 0.25,0.12 0.35,0.24 0.44,0.72 0.62,0.88 0.78,0.95 0.9,0.99 1,1",
);

const CHAT_LINE_EASE = CustomEase.create(
  "chat-line-ease",
  "M0,0 C0.08,0.01 0.18,0.05 0.26,0.2 0.36,0.44 0.54,0.86 0.72,0.95 0.86,0.99 0.94,1 1,1",
);

const INTRO_COORDS = {
  x1: 0.31 * VW,
  x2: 0.69 * VW,
  y1: 0.17 * VH,
  y2: 0.83 * VH,
};

const COLLAPSE_COORDS = {
  x1: 0.37 * VW,
  x2: 0.63 * VW,
  y1: 0.23 * VH,
  y2: 0.83 * VH,
};

const CHAT_W = 1920;
const CHAT_H = 1080;
const CHAT_BLUE = "#8494FF";
const CHAT_BG = "#1e1919";
const CHAT_V1 = 56;
const CHAT_V2 = 254;
const CHAT_V3 = 1524;
const CHAT_L1 = 328.5;
const CHAT_L2 = 469.5;
const CHAT_L3 = 610.5;
const CHAT_L4 = 751.5;
const CHAT_GREEN_START_X = CHAT_V2 + ((CHAT_V3 - CHAT_V2) * 2) / 3;
const CHAT_X_MID = (CHAT_V2 + CHAT_V3) / 2;
const CHAT_Y_MID = CHAT_H / 2;
const CHAT_TITLE_TOP_EXPAND = 36;
const CHAT_TITLE_BOTTOM_EXPAND = 56;
const CHAT_TITLE_TEXT_BASE_HEIGHT = CHAT_L3 - CHAT_L2;
const CHAT_TITLE_FO_Y = CHAT_L2 - CHAT_TITLE_TOP_EXPAND;
const CHAT_TITLE_FO_HEIGHT = CHAT_TITLE_TEXT_BASE_HEIGHT + CHAT_TITLE_TOP_EXPAND + CHAT_TITLE_BOTTOM_EXPAND;
const CHAT_TITLE_MASK_Y = CHAT_TITLE_FO_Y;
const CHAT_TITLE_MASK_HEIGHT = CHAT_TITLE_FO_HEIGHT;
const CHAT_QUOTE_TL_X = 320;
const CHAT_QUOTE_TL_Y = 120;
const CHAT_QUOTE_BR_X = 1480;
const CHAT_QUOTE_BR_Y = 1000;
const CHAT_QUOTE_SCALE = 1.4;

// Background reference grid positions (non-uniform)
const GRID_V = [0.08, 0.18, 0.30, 0.42, 0.58, 0.70, 0.82, 0.92].map((r) => r * VW);
const GRID_H = [0.06, 0.14, 0.28, 0.44, 0.56, 0.72, 0.86, 0.94].map((r) => r * VH);

export function LoginWindowDemo() {
  const [activeWindow, setActiveWindow] = useState<"login" | "chat">("login");
  const [loginRenderKey, setLoginRenderKey] = useState(0);

  const handleOpenChat = () => setActiveWindow("chat");
  const handleBackToLogin = () => {
    setActiveWindow("login");
    setLoginRenderKey((v) => v + 1);
  };

  if (activeWindow === "chat") {
    return <LightRAGChatWindow onBack={handleBackToLogin} />;
  }

  return <LoginIntroWindow key={loginRenderKey} onSignIn={handleOpenChat} />;
}

function LoginIntroWindow({ onSignIn }: { onSignIn: () => void }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const beamsLayerRef = useRef<HTMLDivElement>(null);
  const coordsRef = useRef({ ...INTRO_COORDS });
  const canTriggerRef = useRef(false);
  const playedRef = useRef(false);
  const [inverted, setInverted] = useState(false);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const coords = coordsRef.current;
    const mainLines = svg.querySelectorAll<SVGLineElement>(".main-line");
    const logoLines = svg.querySelectorAll<SVGPathElement>(".logo-stroke");
    const gridLines = svg.querySelectorAll<SVGLineElement>(".ref-grid");
    const clipRect = svg.querySelector<SVGRectElement>("#clip-rect");
    const panelRect = svg.querySelector<SVGRectElement>("#panel-fill");
    const introPanel = svg.querySelector<SVGForeignObjectElement>("#intro-panel");
    const loginPanel = svg.querySelector<SVGForeignObjectElement>("#login-panel");
    const hintLayer = svg.querySelector<SVGGElement>("#hint-layer");
    const logoGroup = svg.querySelector<SVGGElement>("#logo-group");
    const logoFill = svg.querySelector<SVGGElement>("#logo-fill");
    const logoOutline = svg.querySelector<SVGGElement>("#logo-outline");
    const beamsLayer = beamsLayerRef.current;

    // Prepare stroke-dashoffset for draw animation
    mainLines.forEach((line) => {
      const len = line.getTotalLength();
      gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
    });
    logoLines.forEach((path) => {
      const len = path.getTotalLength();
      gsap.set(path, { strokeDasharray: len, strokeDashoffset: len });
    });

    gsap.set(gridLines, { opacity: 0.55 });
    gsap.set(introPanel, { opacity: 0 });
    gsap.set(hintLayer, { opacity: 0 });
    gsap.set(loginPanel, { opacity: 0 });
    if (beamsLayer) gsap.set(beamsLayer, { opacity: 0.17 });
    if (logoFill) gsap.set(logoFill, { fillOpacity: 0 });
    if (panelRect) {
      gsap.set(panelRect, {
        fill: "#ffffff",
        attr: {
          x: (coords.x1 + coords.x2) / 2,
          y: (coords.y1 + coords.y2) / 2,
          width: 0,
          height: 0,
        },
      });
    }

    updateLines(svg, coords);
    updateClipRect(clipRect, coords);
    updatePanelLayout(introPanel, loginPanel, coords);
    updateLogoPosition(logoGroup, coords);

    const introTl = gsap.timeline({
      defaults: { ease: "power2.out" },
      onComplete: () => {
        canTriggerRef.current = true;
      },
    });

    // === Phase 1: Draw ===
    introTl.to(mainLines, {
      strokeDashoffset: 0,
      duration: 1.08,
      ease: LINE_DRAW_EASE,
      stagger: 0.08,
    }, 0);

    introTl.to(logoLines, {
      strokeDashoffset: 0,
      duration: 0.94,
      ease: LOGO_DRAW_EASE,
      stagger: 0.04,
    }, 0.12);

    if (panelRect) {
      introTl.to(panelRect, {
        attr: {
          x: coords.x1,
          y: coords.y1,
          width: coords.x2 - coords.x1,
          height: coords.y2 - coords.y1,
        },
        duration: 0.72,
        ease: "power3.out",
      }, 0.40);
    }

    if (logoFill) {
      introTl.to(logoFill, {
        fillOpacity: 1,
        duration: 0.35,
      }, 0.74);
    }

    introTl.fromTo(introPanel, {
      opacity: 0,
      y: coords.y1 + 20,
    }, {
      opacity: 1,
      y: coords.y1 + 16,
      duration: 0.42,
      ease: "power2.out",
    }, 0.9);

    introTl.to(hintLayer, {
      opacity: 1,
      duration: 0.28,
    }, 1.1);

    // === Phase 2: Inversion + collapse + login switch ===
    const stage2Tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });

    stage2Tl.to(coords, {
      ...COLLAPSE_COORDS,
      duration: 1.02,
      onUpdate: () => {
        updateLines(svg, coords);
        updateClipRect(clipRect, coords);
        updatePanelFill(panelRect, coords);
        updatePanelLayout(introPanel, loginPanel, coords);
        updateLogoPosition(logoGroup, coords);
      },
    }, 0);

    if (panelRect) {
      stage2Tl.to(panelRect, { fill: BRAND_BLUE, duration: 0.54 }, 0.05);
    }
    stage2Tl.to(introPanel, { opacity: 0, duration: 0.22 }, 0.12);
    stage2Tl.to(loginPanel, { opacity: 1, duration: 0.34 }, 0.24);
    stage2Tl.to(hintLayer, { opacity: 0, duration: 0.18 }, 0.03);
    if (logoOutline) {
      stage2Tl.to(logoOutline, { stroke: "#ffffff", duration: 0.45 }, 0.08);
    }
    if (logoFill) {
      stage2Tl.to(logoFill.querySelectorAll("path"), { fill: "#ffffff", duration: 0.45 }, 0.08);
    }
    stage2Tl.call(() => setInverted(true), [], 0.06);

    // Trigger logic
    const playStage2 = () => {
      if (!canTriggerRef.current || playedRef.current) return;
      playedRef.current = true;
      stage2Tl.play(0);
    };
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) playStage2();
    };
    const onClick = () => playStage2();

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("click", onClick);
    introTl.play(0);

    return () => {
      introTl.kill();
      stage2Tl.kill();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <main className="login-svg-page">
      <div ref={beamsLayerRef} className="login-beams-layer" aria-hidden="true">
        <BeamsBackground
          beamWidth={2.4}
          beamHeight={17}
          beamNumber={10}
          lightColor="#4a68ff"
          speed={0.85}
          noiseIntensity={1.05}
          scale={0.22}
          rotation={18}
        />
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="xMidYMid slice"
        className="login-svg-canvas"
      >
        <defs>
          <clipPath id="text-clip">
            <rect id="clip-rect" x={INTRO_COORDS.x1} y={INTRO_COORDS.y1} width={INTRO_COORDS.x2 - INTRO_COORDS.x1} height={INTRO_COORDS.y2 - INTRO_COORDS.y1} />
          </clipPath>
        </defs>

        {/* Background reference grid (hidden initially) */}
        {GRID_V.map((x, i) => (
          <line key={`gv-${i}`} className="ref-grid" x1={x} y1={0} x2={x} y2={VH} stroke={GRID_COLOR} strokeWidth={1} />
        ))}
        {GRID_H.map((y, i) => (
          <line key={`gh-${i}`} className="ref-grid" x1={0} y1={y} x2={VW} y2={y} stroke={GRID_COLOR} strokeWidth={1} />
        ))}

        <rect
          id="panel-fill"
          x={INTRO_COORDS.x1}
          y={INTRO_COORDS.y1}
          width={INTRO_COORDS.x2 - INTRO_COORDS.x1}
          height={INTRO_COORDS.y2 - INTRO_COORDS.y1}
          fill="#ffffff"
        />

        {/* Four main structural lines */}
        <line className="main-line" id="line-left" x1={INTRO_COORDS.x1} y1={0} x2={INTRO_COORDS.x1} y2={VH} stroke={BRAND_BLUE} strokeWidth={PHASE1_STROKE} />
        <line className="main-line" id="line-right" x1={INTRO_COORDS.x2} y1={0} x2={INTRO_COORDS.x2} y2={VH} stroke={BRAND_BLUE} strokeWidth={PHASE1_STROKE} />
        <line className="main-line" id="line-top" x1={0} y1={INTRO_COORDS.y1} x2={VW} y2={INTRO_COORDS.y1} stroke={BRAND_BLUE} strokeWidth={PHASE1_STROKE} />
        <line className="main-line" id="line-bottom" x1={0} y1={INTRO_COORDS.y2} x2={VW} y2={INTRO_COORDS.y2} stroke={BRAND_BLUE} strokeWidth={PHASE1_STROKE} />

        {/* Logo: 5-diamond Dropbox-like mark, anchored panel bottom-left */}
        <g id="logo-group">
          <g id="logo-outline">
            {getLogoDiamonds().map((diamond, idx) => (
              <path key={`logo-outline-${idx}`} className="logo-stroke" d={logoPath(diamond.cx, diamond.cy, diamond.size)} fill="none" stroke={BRAND_BLUE} strokeWidth={1.5} />
            ))}
          </g>
          <g id="logo-fill">
            {getLogoDiamonds().map((diamond, idx) => (
              <path key={`logo-fill-${idx}`} d={logoPath(diamond.cx, diamond.cy, diamond.size)} fill={BRAND_BLUE} />
            ))}
          </g>
        </g>

        {/* Text layer: clipped by the dynamic rectangle */}
        <g clipPath="url(#text-clip)">
          <foreignObject id="intro-panel" x={INTRO_COORDS.x1 + 16} y={INTRO_COORDS.y1 + 16} width={INTRO_COORDS.x2 - INTRO_COORDS.x1 - 32} height={INTRO_COORDS.y2 - INTRO_COORDS.y1 - 32}>
            <div className={`svg-text-content ${inverted ? "is-inverted" : ""}`}>
              <div className="svg-intro">
                <h1 className="svg-headline">
                  LightRAG makes police information retrieval smarter.
                </h1>
              </div>
            </div>
          </foreignObject>
          <foreignObject id="login-panel" x={INTRO_COORDS.x1 + 16} y={INTRO_COORDS.y1 + 16} width={INTRO_COORDS.x2 - INTRO_COORDS.x1 - 32} height={INTRO_COORDS.y2 - INTRO_COORDS.y1 - 32}>
            <div className="svg-text-content is-inverted">
              <LoginForm onSignIn={onSignIn} />
            </div>
          </foreignObject>
        </g>

        <g id="hint-layer">
          <text x={INTRO_COORDS.x2 - 22} y={INTRO_COORDS.y2 - 14} textAnchor="end" className="svg-scroll-hint">
            ˅˅
          </text>
        </g>
      </svg>
    </main>
  );
}

function LoginForm({ onSignIn }: { onSignIn: () => void }) {
  const [showPwd, setShowPwd] = useState(false);
  return (
    <form className="svg-login-form" onClick={(e) => e.stopPropagation()}>
      <div className="svg-field">
        <input type="email" placeholder=" " id="sv-email" autoComplete="email" required />
        <label htmlFor="sv-email">Email</label>
      </div>
      <div className="svg-field svg-field-pwd">
        <input
          type={showPwd ? "text" : "password"}
          placeholder=" "
          id="sv-pwd"
          autoComplete="current-password"
          required
        />
        <label htmlFor="sv-pwd">Password</label>
        <button
          type="button"
          className="svg-toggle-pwd"
          onClick={() => setShowPwd((v) => !v)}
        >
          {showPwd ? "Hide" : "Show"}
        </button>
      </div>
      <div className="svg-form-row">
        <label className="svg-checkbox">
          <input type="checkbox" />
          <span>Remember me</span>
        </label>
        <a href="#forgot">Forgot?</a>
      </div>
      <button type="button" className="svg-submit" onClick={onSignIn}>Sign in</button>
      <p className="svg-register">
        No account? <a href="#register">Create one</a>
      </p>
    </form>
  );
}

// Update main line positions from coords
function updateLines(svg: SVGSVGElement, c: { x1: number; x2: number; y1: number; y2: number }) {
  const set = (id: string, attrs: Record<string, number>) => {
    const el = svg.querySelector(`#${id}`);
    if (el) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  };
  set("line-left", { x1: c.x1, x2: c.x1 });
  set("line-right", { x1: c.x2, x2: c.x2 });
  set("line-top", { y1: c.y1, y2: c.y1 });
  set("line-bottom", { y1: c.y2, y2: c.y2 });
}

function updateClipRect(rect: SVGRectElement | null, c: { x1: number; x2: number; y1: number; y2: number }) {
  if (!rect) return;
  rect.setAttribute("x", String(c.x1));
  rect.setAttribute("y", String(c.y1));
  rect.setAttribute("width", String(c.x2 - c.x1));
  rect.setAttribute("height", String(c.y2 - c.y1));
}

function logoPath(cx: number, cy: number, size: number) {
  const h = size / 2;
  return `M${cx},${cy - h} L${cx + h},${cy} L${cx},${cy + h} L${cx - h},${cy} Z`;
}

function updatePanelFill(rect: SVGRectElement | null, c: { x1: number; x2: number; y1: number; y2: number }) {
  if (!rect) return;
  rect.setAttribute("x", String(c.x1));
  rect.setAttribute("y", String(c.y1));
  rect.setAttribute("width", String(c.x2 - c.x1));
  rect.setAttribute("height", String(c.y2 - c.y1));
}

function updatePanelLayout(
  introPanel: SVGForeignObjectElement | null,
  loginPanel: SVGForeignObjectElement | null,
  c: { x1: number; x2: number; y1: number; y2: number },
) {
  const pad = 16;
  const x = c.x1 + pad;
  const y = c.y1 + pad;
  const width = Math.max(10, c.x2 - c.x1 - pad * 2);
  const height = Math.max(10, c.y2 - c.y1 - pad * 2);

  [introPanel, loginPanel].forEach((panel) => {
    if (!panel) return;
    panel.setAttribute("x", String(x));
    panel.setAttribute("y", String(y));
    panel.setAttribute("width", String(width));
    panel.setAttribute("height", String(height));
  });
}

function updateLogoPosition(group: SVGGElement | null, c: { x1: number; x2: number; y1: number; y2: number }) {
  if (!group) return;
  const panelWidth = c.x2 - c.x1;
  const scale = Math.max(0.58, Math.min(1, panelWidth / (INTRO_COORDS.x2 - INTRO_COORDS.x1)));
  const x = c.x1 + 24;
  const y = c.y2 - 44;
  group.setAttribute("transform", `translate(${x}, ${y}) scale(${scale})`);
}

function getLogoDiamonds() {
  return [
    { cx: 10, cy: 6, size: 10 },
    { cx: 22, cy: 6, size: 10 },
    { cx: 4, cy: 16, size: 10 },
    { cx: 16, cy: 16, size: 10 },
    { cx: 28, cy: 16, size: 10 },
  ];
}

function LightRAGChatWindow({ onBack }: { onBack: () => void }) {
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
    gsap.set(topQuotePanel, {
      autoAlpha: 0,
      yPercent: 8,
      scale: 0.98,
      transformOrigin: "50% 50%",
    });
    gsap.set(bottomQuotePanel, {
      autoAlpha: 0,
      yPercent: 8,
      scale: 0.98,
      transformOrigin: "50% 50%",
    });
    gsap.set(cornerQuotes, {
      autoAlpha: 0,
      yPercent: 14,
      scale: 0.82,
      transformOrigin: "50% 50%",
    });
    gsap.set(lines, {
      stroke: "#ffffff",
      strokeWidth: 1,
      strokeOpacity: 1,
      shapeRendering: "crispEdges",
      filter: "none",
    });

    const tl = gsap.timeline({
      onStart: () => {
        gsap.set(lines, { shapeRendering: "geometricPrecision" });
      },
      onComplete: () => {
        gsap.set(lines, { shapeRendering: "crispEdges" });
      },
    });

    tl.to(chars, {
      yPercent: 0,
      opacity: 1,
      duration: 0.62,
      ease: "power3.out",
      stagger: 0.03,
    }, 0.08);

    tl.to(hL2, {
      attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W },
      duration: 0.52,
      ease: CHAT_LINE_EASE,
    }, 0.22);
    tl.to(hL3, {
      attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W },
      duration: 0.52,
      ease: CHAT_LINE_EASE,
    }, 0.30);
    tl.to(hL1, {
      attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W },
      duration: 0.52,
      ease: CHAT_LINE_EASE,
    }, 0.40);
    tl.to(hL4, {
      attr: { x1: CHAT_V1 + 0.5, x2: CHAT_W },
      duration: 0.52,
      ease: CHAT_LINE_EASE,
    }, 0.52);

    tl.to(v2, {
      attr: { y1: 0, y2: CHAT_H },
      duration: 0.46,
      ease: CHAT_LINE_EASE,
    }, 0.60);
    tl.to(v3, {
      attr: { y1: 0, y2: CHAT_H },
      duration: 0.46,
      ease: CHAT_LINE_EASE,
    }, 0.68);
    tl.to(v1, {
      attr: { y1: 0, y2: CHAT_H },
      duration: 0.46,
      ease: CHAT_LINE_EASE,
    }, 0.78);

    tl.to(lines, {
      stroke: CHAT_BLUE,
      // Keep a full physical pixel, use opacity for "thin" perception.
      strokeWidth: 1,
      strokeOpacity: 0.3,
      duration: 0.8,
      ease: "sine.inOut",
    }, 0.92);

    if (yellowReveal) {
      tl.to(yellowReveal, {
        attr: { width: CHAT_W - CHAT_V3 + 64 },
        duration: 0.54,
        ease: "power3.out",
      }, 1.00);
    }
    if (greenReveal) {
      tl.to(greenReveal, {
        attr: { y: CHAT_L4 - 48, height: CHAT_H - CHAT_L4 + 48 },
        duration: 0.56,
        ease: "power3.out",
      }, 1.08);
    }
    tl.to(topQuotePanel, {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      duration: 0.36,
      ease: "power2.out",
    }, 1.06);
    tl.to(bottomQuotePanel, {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      duration: 0.36,
      ease: "power2.out",
    }, 1.14);
    tl.to(cornerQuotes, {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      duration: 0.42,
      ease: "back.out(1.9)",
      stagger: 0.12,
    }, 1.12);

    if (backBtn) {
      tl.fromTo(backBtn, {
        scale: 0.88,
        transformOrigin: "28px 540px",
      }, {
        scale: 1,
        duration: 0.24,
        ease: "back.out(2)",
      }, 1.15);
    }

    return () => {
      tl.kill();
    };
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
            <rect
              x={CHAT_V3}
              y={0}
              width={CHAT_W - CHAT_V3}
              height={CHAT_L1}
              fill="black"
            />
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
            <rect
              x={CHAT_GREEN_START_X}
              y={CHAT_L4}
              width={CHAT_V3 - CHAT_GREEN_START_X}
              height={CHAT_H - CHAT_L4}
              fill="black"
            />
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
            <rect
              x={CHAT_V2}
              y={CHAT_TITLE_MASK_Y}
              width={CHAT_V3 - CHAT_V2}
              height={CHAT_TITLE_MASK_HEIGHT}
            />
          </clipPath>
        </defs>

        <rect x={0} y={0} width={CHAT_W} height={CHAT_H} fill={CHAT_BG} />

        <rect
          x={CHAT_V3}
          y={0}
          width={CHAT_W - CHAT_V3}
          height={CHAT_L1}
          fill="#F7D147"
          mask="url(#chat-yellow-mask)"
        />
        <rect
          x={CHAT_GREEN_START_X}
          y={CHAT_L4}
          width={CHAT_V3 - CHAT_GREEN_START_X}
          height={CHAT_H - CHAT_L4}
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

        <foreignObject
          x={CHAT_V3}
          y={0}
          width={CHAT_W - CHAT_V3}
          height={CHAT_L1}
          xmlns="http://www.w3.org/1999/xhtml"
        >
          <div className="chat-quote-panel chat-quote-panel-top chat-quote-panel-anim">
            <p>Go from idea to done</p>
            <p>with Dropbox.</p>
          </div>
        </foreignObject>

        <foreignObject
          x={CHAT_GREEN_START_X}
          y={CHAT_L4}
          width={CHAT_V3 - CHAT_GREEN_START_X}
          height={CHAT_H - CHAT_L4}
          xmlns="http://www.w3.org/1999/xhtml"
        >
          <div className="chat-quote-panel chat-quote-panel-bottom chat-quote-panel-anim">
            <p>These are not just your</p>
            <p>files. They are pieces</p>
            <p>of your life.</p>
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
