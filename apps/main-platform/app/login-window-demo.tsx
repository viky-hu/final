"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";

const BRAND_BLUE = "#3152f4";
const GRID_COLOR = "rgba(49, 82, 244, 0.12)";
const VW = 1440;
const VH = 900;
const PHASE1_STROKE = 1.5;

const INTRO_COORDS = {
  x1: 0.31 * VW,
  x2: 0.69 * VW,
  y1: 0.07 * VH,
  y2: 0.83 * VH,
};

const COLLAPSE_COORDS = {
  x1: 0.38 * VW,
  x2: 0.62 * VW,
  y1: 0.23 * VH,
  y2: 0.83 * VH,
};

// Background reference grid positions (non-uniform)
const GRID_V = [0.08, 0.18, 0.30, 0.42, 0.58, 0.70, 0.82, 0.92].map((r) => r * VW);
const GRID_H = [0.06, 0.14, 0.28, 0.44, 0.56, 0.72, 0.86, 0.94].map((r) => r * VH);

export function LoginWindowDemo() {
  const svgRef = useRef<SVGSVGElement>(null);
  const coordsRef = useRef({ ...INTRO_COORDS });
  const canTriggerRef = useRef(false);
  const playedRef = useRef(false);
  const stage2Ref = useRef<gsap.core.Timeline | null>(null);
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
    if (logoFill) gsap.set(logoFill, { fillOpacity: 0 });
    if (panelRect) gsap.set(panelRect, { fill: "#ffffff" });

    updateLines(svg, coords);
    updateClipRect(clipRect, coords);
    updatePanelFill(panelRect, coords);
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
      duration: 0.95,
      stagger: 0.08,
    }, 0);

    introTl.to(logoLines, {
      strokeDashoffset: 0,
      duration: 0.92,
      stagger: 0.04,
    }, 0.12);

    if (logoFill) {
      introTl.to(logoFill, {
        fillOpacity: 1,
        duration: 0.35,
      }, 0.72);
    }

    introTl.to(introPanel, {
      opacity: 1,
      duration: 0.45,
    }, 0.9);

    introTl.to(hintLayer, {
      opacity: 1,
      duration: 0.32,
    }, 1.05);

    // === Phase 2: Inversion + collapse + login switch ===
    const stage2Tl = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
    stage2Ref.current = stage2Tl;

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
                  At Dropbox, our Brand Guidelines help us infuse everything we make with identity.
                </h1>
              </div>
            </div>
          </foreignObject>
          <foreignObject id="login-panel" x={INTRO_COORDS.x1 + 16} y={INTRO_COORDS.y1 + 16} width={INTRO_COORDS.x2 - INTRO_COORDS.x1 - 32} height={INTRO_COORDS.y2 - INTRO_COORDS.y1 - 32}>
            <div className="svg-text-content is-inverted">
              <LoginForm />
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

function LoginForm() {
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
      <button type="button" className="svg-submit">Sign in</button>
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
