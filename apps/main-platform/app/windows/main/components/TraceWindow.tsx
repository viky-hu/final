"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { gsap } from "gsap";
import { LINE_DRAW_EASE } from "../../shared/animation";

// ─── SVG canvas dimensions ────────────────────────────────────────────────────
const TVW = 1440;
const TVH = 900;

// ─── Vertical line x-positions (shifted left for 150% zoom visual balance) ───
const VL = 384;   // main left  (was 432)
const VM = 888;   // aux mid    (was 936)
const VR = 1152;  // main right (was 1224)

// ─── Line definitions ─────────────────────────────────────────────────────────
const LINE_DEFS: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [
  // outer frame boundary lines (new)
  { id: "tl-H-Bound-T",  x1: 0,   y1: 60,  x2: TVW, y2: 60  },
  { id: "tl-H-Bound-B",  x1: TVW, y1: 800, x2: 0,   y2: 800 },
  // main vertical lines — bounded to outer frame
  { id: "tl-V-Main-L",   x1: VL,  y1: 60,  x2: VL,  y2: 800 },
  { id: "tl-V-Main-R",   x1: VR,  y1: 60,  x2: VR,  y2: 800 },
  // inner horizontal lines — full viewport width
  { id: "tl-H-Main-T",   x1: 0,   y1: 135, x2: TVW, y2: 135 },
  { id: "tl-H-Main-B",   x1: TVW, y1: 720, x2: 0,   y2: 720 },
  // auxiliary lines
  { id: "tl-H-Aux-1",    x1: VL,  y1: 405, x2: VR,  y2: 405 },
  { id: "tl-V-Aux-1",    x1: VM,  y1: 405, x2: VM,  y2: 720 },
  // decorative
  { id: "tl-Deco-1",     x1: 355, y1: 540, x2: 413, y2: 540 },
  { id: "tl-Cross-1-H",  x1: 870, y1: 405, x2: 906, y2: 405 },
  { id: "tl-Cross-1-V",  x1: VM,  y1: 387, x2: VM,  y2: 423 },
];

// ─── Node dots at key intersections ──────────────────────────────────────────
const NODE_DOTS: { id: string; cx: number; cy: number }[] = [
  // outer boundary corners
  { id: "nd-bt-l", cx: VL,  cy: 60  },
  { id: "nd-bt-r", cx: VR,  cy: 60  },
  // inner frame intersections
  { id: "nd-1",    cx: VL,  cy: 135 },
  { id: "nd-2",    cx: VR,  cy: 135 },
  { id: "nd-3",    cx: VL,  cy: 405 },
  { id: "nd-4",    cx: VM,  cy: 405 },
  { id: "nd-5",    cx: VR,  cy: 405 },
  { id: "nd-6",    cx: VM,  cy: 720 },
  { id: "nd-7",    cx: VR,  cy: 720 },
  // outer boundary bottom corners
  { id: "nd-bb-l", cx: VL,  cy: 800 },
  { id: "nd-bb-r", cx: VR,  cy: 800 },
];

// ─── 5 source regions bounded by drawn lines ──────────────────────────────────
const REGIONS = [
  {
    id: "left",
    x: 0,   y: 135, w: VL,      h: 585,
    label: "SOURCE · 01",
    title: "核心架构设计规范_v4.pdf",
  },
  {
    id: "top-c",
    x: VL,  y: 135, w: VR - VL, h: 270,
    label: "SOURCE · 02",
    title: "性能基准测试报告_2026Q1.pdf",
  },
  {
    id: "btm-cl",
    x: VL,  y: 405, w: VM - VL, h: 315,
    label: "SOURCE · 03",
    title: "数据合规审计年度报告.docx",
  },
  {
    id: "btm-cr",
    x: VM,  y: 405, w: VR - VM, h: 315,
    label: "SOURCE · 04",
    title: "模型微调实验日志.md",
  },
  {
    id: "right",
    x: VR,  y: 135, w: TVW - VR, h: 585,
    label: "SOURCE · 05",
    title: "分布式系统设计文档.pdf",
  },
] as const;

// ─── Phase type ────────────────────────────────────────────────────────────────
// p1_draw   : scrollTop 0→vh; lines draw as user scrolls p1→p2
// p2_locked : scrollTop locked at vh; 0.5s auto-reveal plays
// p3_free   : scrollTop >vh; SVG translates up to simulate being "in" p2
type Phase = "p1_draw" | "p2_locked" | "p3_free";

// ─── Scroll constant: lines complete after exactly 1 viewport height of scroll ─
const LINE_DRAW_VH = 1;

// ─── Knowledge graph node/edge data ──────────────────────────────────────────
const KG_NODES = [
  { id: "c0", x: 720,  y: 510, r: 46, type: "center" as const, label: "本次回答",   sub: "KNOWLEDGE NODE" },
  { id: "s1", x: 200,  y: 310, r: 27, type: "source" as const, label: "核心架构",   sub: "" },
  { id: "s2", x: 590,  y: 225, r: 27, type: "source" as const, label: "性能测试",   sub: "" },
  { id: "s3", x: 530,  y: 710, r: 27, type: "source" as const, label: "数据合规",   sub: "" },
  { id: "s4", x: 920,  y: 700, r: 27, type: "source" as const, label: "模型微调",   sub: "" },
  { id: "s5", x: 1200, y: 340, r: 27, type: "source" as const, label: "分布式系统", sub: "" },
  { id: "k1", x: 290,  y: 580, r: 17, type: "concept" as const, label: "架构设计",  sub: "" },
  { id: "k2", x: 860,  y: 245, r: 17, type: "concept" as const, label: "实验数据",  sub: "" },
  { id: "k3", x: 1065, y: 630, r: 17, type: "concept" as const, label: "系统优化",  sub: "" },
  { id: "k4", x: 380,  y: 775, r: 17, type: "concept" as const, label: "合规审计",  sub: "" },
];

const KG_EDGES = [
  { from: "c0", to: "s1" }, { from: "c0", to: "s2" },
  { from: "c0", to: "s3" }, { from: "c0", to: "s4" },
  { from: "c0", to: "s5" },
  { from: "s1", to: "k1" }, { from: "s2", to: "k2" },
  { from: "s4", to: "k3" }, { from: "s3", to: "k4" },
];

// ─── Knowledge Graph SVG component ────────────────────────────────────────────
function KnowledgeGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const animatedRef  = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || animatedRef.current) return;
        animatedRef.current = true;
        observer.disconnect();

        const nodes  = el.querySelectorAll<SVGCircleElement>(".kg-node");
        const edges  = el.querySelectorAll<SVGLineElement>(".kg-edge");
        const labels = el.querySelectorAll<SVGTextElement>(".kg-label");

        gsap.set(nodes,  { scale: 0, transformOrigin: "center center", opacity: 0 });
        edges.forEach((e) => {
          const len = e.getTotalLength?.() ?? 100;
          gsap.set(e, { strokeDasharray: len, strokeDashoffset: len, opacity: 0 });
        });
        gsap.set(labels, { opacity: 0 });

        const tl = gsap.timeline({ delay: 0.35 });
        tl.to(nodes,  { scale: 1, opacity: 1, stagger: 0.07, duration: 0.55, ease: "back.out(2)" });
        tl.to(edges,  { strokeDashoffset: 0, opacity: 0.6, stagger: 0.05, duration: 0.9, ease: LINE_DRAW_EASE }, "-=0.3");
        tl.to(labels, { opacity: 1, stagger: 0.05, duration: 0.45, ease: "power2.out" }, "-=0.4");
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const nodeMap = Object.fromEntries(KG_NODES.map((n) => [n.id, n]));

  return (
    <div ref={containerRef} className="kg-container">
      <svg
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid meet"
        className="kg-svg"
        aria-label="知识图谱"
      >
        {/* Edges */}
        {KG_EDGES.map(({ from, to }) => {
          const f  = nodeMap[from];
          const t2 = nodeMap[to];
          if (!f || !t2) return null;
          const primary = from === "c0" || to === "c0";
          return (
            <line
              key={`${from}-${to}`}
              className="kg-edge"
              x1={f.x}  y1={f.y}
              x2={t2.x} y2={t2.y}
              stroke={primary ? "#27FF64" : "rgba(39,255,100,0.45)"}
              strokeWidth={primary ? 0.9 : 0.55}
            />
          );
        })}

        {/* Nodes */}
        {KG_NODES.map((n) => (
          <g key={n.id}>
            {n.type === "center" ? (
              <>
                <circle className="kg-node" cx={n.x} cy={n.y} r={n.r}
                  fill="rgba(39,255,100,0.1)" stroke="#27FF64" strokeWidth={1.5} />
                <circle className="kg-node" cx={n.x} cy={n.y} r={n.r * 0.72}
                  fill="rgba(39,255,100,0.07)" stroke="rgba(39,255,100,0.45)" strokeWidth={0.7} />
                <text className="kg-label" x={n.x} y={n.y - 4}
                  textAnchor="middle" fill="#27FF64" fontSize={14}
                  fontFamily="Michroma, monospace" letterSpacing="0.08em">
                  {n.label}
                </text>
                <text className="kg-label" x={n.x} y={n.y + 15}
                  textAnchor="middle" fill="rgba(39,255,100,0.5)" fontSize={9}
                  fontFamily="Michroma, monospace" letterSpacing="0.1em">
                  {n.sub}
                </text>
              </>
            ) : n.type === "source" ? (
              <>
                <circle className="kg-node" cx={n.x} cy={n.y} r={n.r}
                  fill="rgba(39,255,100,0.07)" stroke="#27FF64" strokeWidth={0.9} />
                <text className="kg-label" x={n.x} y={n.y + n.r + 15}
                  textAnchor="middle" fill="rgba(252,248,248,0.75)" fontSize={11}
                  fontFamily="Michroma, monospace">
                  {n.label}
                </text>
              </>
            ) : (
              <>
                <circle className="kg-node" cx={n.x} cy={n.y} r={n.r}
                  fill="rgba(39,255,100,0.04)" stroke="rgba(39,255,100,0.35)" strokeWidth={0.6} />
                <text className="kg-label" x={n.x} y={n.y + n.r + 13}
                  textAnchor="middle" fill="rgba(252,248,248,0.5)" fontSize={10}
                  fontFamily="system-ui, -apple-system, sans-serif">
                  {n.label}
                </text>
              </>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface TraceWindowProps {
  msgId: string;
  onClose: () => void;
}

// ─── Main component ────────────────────────────────────────────────────────────
export function TraceWindow({ msgId, onClose }: TraceWindowProps) {
  const rootRef      = useRef<HTMLDivElement>(null);
  const scrollerRef  = useRef<HTMLDivElement>(null);
  const svgLayerRef  = useRef<HTMLDivElement>(null);
  const svgRef       = useRef<SVGSVGElement>(null);

  const phaseRef         = useRef<Phase>("p1_draw");
  const lineDrawTlRef    = useRef<gsap.core.Timeline | null>(null);
  const revealTlRef      = useRef<gsap.core.Timeline | null>(null);
  const lockScrollTopRef = useRef(0);

  // All active cleanup functions — called on unmount or re-cleanup
  const cleanupFnsRef = useRef<(() => void)[]>([]);

  const [hint, setHint]         = useState("↓ 向下滚动开始绘制线框");
  const [showHint, setShowHint] = useState(true);

  // ── Entry slide-in ─────────────────────────────────────────────────────────
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    gsap.set(root, { yPercent: 100 });
    const t = gsap.to(root, { yPercent: 0, duration: 0.72, ease: "power3.out" });
    return () => { t.kill(); };
  }, []);

  // ── Initialize SVG: set all lines invisible, regions collapsed ─────────────
  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    LINE_DEFS.forEach(({ id }) => {
      const el = svg.querySelector<SVGLineElement>(`#${id}`);
      if (!el) return;
      const len = el.getTotalLength();
      gsap.set(el, { strokeDasharray: len, strokeDashoffset: len });
    });

    gsap.set(svg.querySelectorAll(".tl-node-dot"), {
      opacity: 0, scale: 0, transformOrigin: "center center",
    });

    REGIONS.forEach(({ id }) => {
      const fill    = svg.querySelector(`#rf-${id}`);
      const content = svg.querySelector(`#rc-${id}`);
      const scan    = svg.querySelector(`#rs-${id}`);
      if (fill)    gsap.set(fill,    { attr: { height: 0 } });
      if (content) gsap.set(content, { opacity: 0 });
      if (scan)    gsap.set(scan,    { opacity: 0 });
    });

    // Build line draw timeline — paused, driven by scroll progress
    // Sequence: outer frame first → main verticals → inner horizontals → aux → deco
    const tl = gsap.timeline({ paused: true });
    const q  = (id: string) => svg.querySelector<SVGLineElement>(`#${id}`);

    tl.to(q("tl-H-Bound-T"),  { strokeDashoffset: 0, duration: 4, ease: LINE_DRAW_EASE }, 0);
    tl.to(q("tl-H-Bound-B"),  { strokeDashoffset: 0, duration: 4, ease: LINE_DRAW_EASE }, "-=2");
    tl.to(q("tl-V-Main-L"),   { strokeDashoffset: 0, duration: 5, ease: LINE_DRAW_EASE }, "-=2");
    tl.to(q("tl-V-Main-R"),   { strokeDashoffset: 0, duration: 5, ease: LINE_DRAW_EASE }, "-=3");
    tl.to(q("tl-H-Main-T"),   { strokeDashoffset: 0, duration: 5, ease: LINE_DRAW_EASE }, "-=2");
    tl.to(q("tl-H-Main-B"),   { strokeDashoffset: 0, duration: 5, ease: LINE_DRAW_EASE }, "-=3");
    tl.to(q("tl-H-Aux-1"),    { strokeDashoffset: 0, duration: 4, ease: LINE_DRAW_EASE }, "-=1");
    tl.to(q("tl-V-Aux-1"),    { strokeDashoffset: 0, duration: 4, ease: LINE_DRAW_EASE }, "-=2");
    tl.to(q("tl-Deco-1"),     { strokeDashoffset: 0, duration: 2, ease: LINE_DRAW_EASE });
    tl.to(q("tl-Cross-1-H"),  { strokeDashoffset: 0, duration: 2, ease: LINE_DRAW_EASE }, "-=2");
    tl.to(q("tl-Cross-1-V"),  { strokeDashoffset: 0, duration: 2, ease: LINE_DRAW_EASE }, "-=2");
    tl.to(svg.querySelectorAll(".tl-node-dot"), {
      opacity: 1, scale: 1.5, yoyo: true, repeat: 1, duration: 1, stagger: 0.1,
    });

    lineDrawTlRef.current = tl;
    return () => { tl.kill(); };
  }, []);

  // ── All phase event-listener logic ─────────────────────────────────────────
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // ── Phase 3 (p3_free): SVG translates up with the canvas ──────────────
    const startFreeScroll = () => {
      phaseRef.current = "p3_free";
      setShowHint(false);

      const svgLayer = svgLayerRef.current;
      if (!svgLayer) return;

      const lockTop = lockScrollTopRef.current;

      // At this moment scrollTop === lockTop, so y=0 — no flash on unlock
      gsap.set(svgLayer, { y: 0 });

      const handleFreeScroll = () => {
        const delta = scroller.scrollTop - lockTop;
        gsap.set(svgLayer, { y: -delta });
      };

      scroller.addEventListener("scroll", handleFreeScroll, { passive: true });
      cleanupFnsRef.current.push(() =>
        scroller.removeEventListener("scroll", handleFreeScroll)
      );
    };

    // ── Phase 2 (p2_locked): hard-lock scroll, auto-play 0.5s reveal ─────
    const startPanelReveal = () => {
      const svg = svgRef.current;
      if (!svg) return;

      phaseRef.current = "p2_locked";
      lockScrollTopRef.current = scroller.scrollTop;
      setHint("线框已完成，正在显现溯源文件…");

      // ── Hard scroll lock: block all input sources ────────────────────────
      const preventWheel = (e: WheelEvent) => { e.preventDefault(); };
      const preventTouch = (e: TouchEvent) => { e.preventDefault(); };
      const preventKeys  = (e: KeyboardEvent) => {
        if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " "].includes(e.key)) {
          e.preventDefault();
        }
      };
      // Clamp scrollTop every frame in case scrollbar is dragged
      const clampScroll = () => {
        scroller.scrollTop = lockScrollTopRef.current;
      };

      scroller.addEventListener("wheel",     preventWheel, { passive: false });
      scroller.addEventListener("touchmove", preventTouch, { passive: false });
      window.addEventListener("keydown",     preventKeys);
      scroller.addEventListener("scroll",    clampScroll);

      const unlock = () => {
        scroller.removeEventListener("wheel",     preventWheel);
        scroller.removeEventListener("touchmove", preventTouch);
        window.removeEventListener("keydown",     preventKeys);
        scroller.removeEventListener("scroll",    clampScroll);
      };
      // Register for unmount cleanup too
      cleanupFnsRef.current.push(unlock);

      // ── 0.5s auto-play reveal timeline ───────────────────────────────────
      const revealTl = gsap.timeline({
        onComplete: () => {
          unlock();
          // Remove this unlock from cleanup list (already called)
          cleanupFnsRef.current = cleanupFnsRef.current.filter(fn => fn !== unlock);
          startFreeScroll();
        },
      });

      // Stage 0: node dots flash bright (0–0.15s)
      revealTl.to(svg.querySelectorAll(".tl-node-dot"), {
        opacity: 1, scale: 1.8, duration: 0.08, stagger: 0.015, ease: "back.out(3)",
      }, 0);
      revealTl.to(svg.querySelectorAll(".tl-node-dot"), {
        scale: 1, duration: 0.1, stagger: 0.015, ease: "power2.out",
      }, 0.09);

      // Stages 1-3: per-region — fill wipe, scan sweep, text float
      // Stagger 5 panels across 0.04–0.48s total
      REGIONS.forEach(({ id, y, h }, i) => {
        const fill    = svg.querySelector(`#rf-${id}`);
        const content = svg.querySelector(`#rc-${id}`);
        const scan    = svg.querySelector(`#rs-${id}`);
        const at      = 0.04 + i * 0.05;

        if (fill) {
          revealTl.fromTo(
            fill,
            { attr: { height: 0, fill: "rgba(39,255,100,0.13)" } },
            { attr: { height: h, fill: "rgba(39,255,100,0.07)" }, duration: 0.18, ease: "power3.out" },
            at,
          );
        }

        if (scan) {
          revealTl.fromTo(
            scan,
            { attr: { y }, opacity: 0.85 },
            { attr: { y: y + h }, opacity: 0, duration: 0.18, ease: "power1.in" },
            at,
          );
        }

        if (content) {
          revealTl.fromTo(
            content,
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.14, ease: "power3.out" },
            at + 0.14,
          );
        }
      });

      revealTlRef.current = revealTl;
    };

    // ── Phase 1 (p1_draw): scroll drives line-drawing timeline ────────────
    const handleLineScroll = () => {
      if (phaseRef.current !== "p1_draw") return;
      const lineDrawEnd = window.innerHeight * LINE_DRAW_VH;
      const progress    = Math.min(scroller.scrollTop / lineDrawEnd, 1);
      lineDrawTlRef.current?.progress(progress);

      if (progress >= 1) {
        scroller.removeEventListener("scroll", handleLineScroll);
        startPanelReveal();
      }
    };

    scroller.addEventListener("scroll", handleLineScroll, { passive: true });
    cleanupFnsRef.current.push(() =>
      scroller.removeEventListener("scroll", handleLineScroll)
    );

    return () => {
      cleanupFnsRef.current.forEach(fn => fn());
      cleanupFnsRef.current = [];
    };
  }, []); // stable — all mutable state accessed via refs

  // ── Timeline cleanup on unmount ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      lineDrawTlRef.current?.kill();
      revealTlRef.current?.kill();
    };
  }, []);

  // ── Close ──────────────────────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    const root = rootRef.current;
    if (!root) { onClose(); return; }
    gsap.to(root, {
      yPercent: 100, duration: 0.5, ease: "power3.in", onComplete: onClose,
    });
  }, [onClose]);

  return (
    <div ref={rootRef} className="trace-window-root" aria-label="知识溯源窗口">
      {/* ── Dark background ── */}
      <div className="trace-window-bg" aria-hidden="true" />

      {/* ── SVG frame layer ──────────────────────────────────────────────────
           Always viewport-fixed (absolute in fixed root).
           In p3_free phase, GSAP applies translateY(-(scrollTop-lockTop))
           so the SVG appears to "scroll up with p2" as user moves into p3.
           At the unlock moment scrollTop===lockTop so translateY=0 — no flash. */}
      <div ref={svgLayerRef} className="trace-svg-layer" aria-hidden="true">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${TVW} ${TVH}`}
          preserveAspectRatio="xMidYMid slice"
          className="trace-frame-svg"
        >
          <defs>
            {/* Clip paths: one per region */}
            {REGIONS.map(({ id, x, y, w, h }) => (
              <clipPath key={id} id={`clip-${id}`}>
                <rect x={x} y={y} width={w} height={h} />
              </clipPath>
            ))}
            {/* Scan-line glow filter */}
            <filter id="tl-scan-glow" x="-5%" y="-200%" width="110%" height="500%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Region fill rects — wipe from top (height: 0 → h via GSAP) */}
          {REGIONS.map(({ id, x, y, w }) => (
            <rect
              key={id}
              id={`rf-${id}`}
              x={x} y={y} width={w} height={0}
              fill="rgba(39,255,100,0.07)"
            />
          ))}

          {/* Scan sweep rects — bright bar that sweeps down during reveal */}
          {REGIONS.map(({ id, x, y, w }) => (
            <rect
              key={id}
              id={`rs-${id}`}
              x={x} y={y} width={w} height={4}
              fill="rgba(39,255,100,0.92)"
              opacity={0}
              filter="url(#tl-scan-glow)"
            />
          ))}

          {/* Region content — clipped strictly inside the region bounds */}
          {REGIONS.map(({ id, x, y, w, h, label, title }) => {
            const cx  = x + w / 2;
            const cy  = y + h / 2;
            const tfs = Math.max(9, Math.min(14, w / 20));
            const lfs = Math.max(7, Math.min(10, w / 30));
            return (
              <g key={id} id={`rc-${id}`} clipPath={`url(#clip-${id})`}>
                <text
                  x={cx} y={cy - tfs - 12}
                  textAnchor="middle"
                  fill="rgba(39,255,100,0.6)"
                  fontSize={lfs}
                  fontFamily="Michroma, monospace"
                  letterSpacing="0.14em"
                >
                  {label}
                </text>
                <line
                  x1={cx - 22} y1={cy - 4}
                  x2={cx + 22} y2={cy - 4}
                  stroke="rgba(39,255,100,0.28)"
                  strokeWidth={0.5}
                />
                <text
                  x={cx} y={cy + tfs + 4}
                  textAnchor="middle"
                  fill="rgba(252,248,248,0.88)"
                  fontSize={tfs}
                  fontFamily="system-ui, -apple-system, sans-serif"
                >
                  {title}
                </text>
              </g>
            );
          })}

          {/* Lines — rendered above fills and content */}
          {LINE_DEFS.map(({ id, x1, y1, x2, y2 }) => (
            <line
              key={id}
              id={id}
              x1={x1} y1={y1} x2={x2} y2={y2}
              stroke="#27FF64"
              strokeWidth={1.5}
              strokeLinecap="square"
              shapeRendering="crispEdges"
            />
          ))}

          {/* Node dots at intersections */}
          {NODE_DOTS.map(({ id, cx, cy }) => (
            <circle
              key={id}
              id={id}
              className="tl-node-dot"
              cx={cx} cy={cy} r={4}
              fill="#27FF64"
            />
          ))}
        </svg>
      </div>

      {/* ── Long canvas scroll container ──────────────────────────────────────
           Strictly 3 screens: p1=100vh | p2=100vh | p3=100vh = 300vh total.
           Line drawing completes when scrollTop reaches 1×viewport height
           (i.e., exactly when p2 fills the screen). */}
      <div ref={scrollerRef} className="trace-scroller">
        <div className="trace-canvas">

          {/* Section 1 — Hero header (100vh, p1) */}
          <section className="trace-hero">
            <div className="trace-hero-glow"   aria-hidden="true" />
            <div className="trace-hero-scan"   aria-hidden="true" />
            <div className="trace-hero-grid"   aria-hidden="true" />
            <div className="trace-hero-inner">
              <p className="trace-header-eyebrow">KNOWLEDGE TRACE</p>
              <h1 className="trace-header-title">知识溯源</h1>
              <p className="trace-header-intro">
                基于向量数据库的语义检索，追溯本次回答的五条原始知识来源。
              </p>
              <p className="trace-header-msgid">
                源自回答&nbsp;<code>{msgId.slice(-8)}</code>
              </p>
            </div>
          </section>

          {/* Section 2 — SVG reveal zone (100vh, p2)
               Empty scroll buffer; the SVG layer renders above this section.
               When scrollTop = 100vh this section fills the viewport exactly,
               which is when lines finish drawing and reveal auto-plays. */}
          <div className="trace-stamp-zone" aria-hidden="true" />

          {/* Section 3 — Knowledge graph (100vh, p3) */}
          <section className="trace-graph-zone">
            <div className="trace-graph-header">
              <p className="trace-graph-eyebrow">KNOWLEDGE GRAPH</p>
              <h2 className="trace-graph-title">知识图谱</h2>
              <p className="trace-graph-subtitle">
                溯源文件关键节点与本次回答的关联映射
              </p>
            </div>
            <KnowledgeGraph />
          </section>

        </div>
      </div>

      {/* ── Scroll hint HUD ── */}
      {showHint && (
        <div className="trace-hint-hud" aria-live="polite">
          <span className="trace-hint-text">{hint}</span>
        </div>
      )}

      {/* ── Close button ── */}
      <button
        className="trace-close-btn"
        onClick={handleClose}
        aria-label="关闭溯源窗口"
      >
        <span className="trace-close-icon" aria-hidden="true">✕</span>
        <span className="trace-close-text">关闭溯源</span>
      </button>
    </div>
  );
}
