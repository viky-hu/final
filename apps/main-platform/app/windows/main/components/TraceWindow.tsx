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

// ─── Line definitions (identical coordinate system to original) ───────────────
const LINE_DEFS: { id: string; x1: number; y1: number; x2: number; y2: number }[] = [
  { id: "tl-V-Main-L",   x1: 432,  y1: 0,   x2: 432,  y2: TVH },
  { id: "tl-V-Main-R",   x1: 1224, y1: 0,   x2: 1224, y2: TVH },
  { id: "tl-H-Main-T",   x1: 0,    y1: 135, x2: TVW,  y2: 135 },
  { id: "tl-H-Main-B",   x1: TVW,  y1: 720, x2: 0,    y2: 720 },
  { id: "tl-H-Aux-1",    x1: 432,  y1: 405, x2: 1224, y2: 405 },
  { id: "tl-V-Aux-1",    x1: 936,  y1: 405, x2: 936,  y2: 720 },
  { id: "tl-Deco-1",     x1: 403,  y1: 540, x2: 461,  y2: 540 },
  { id: "tl-Cross-1-H",  x1: 918,  y1: 405, x2: 954,  y2: 405 },
  { id: "tl-Cross-1-V",  x1: 936,  y1: 387, x2: 936,  y2: 423 },
];

// ─── Node dots at key intersections ──────────────────────────────────────────
const NODE_DOTS: { id: string; cx: number; cy: number }[] = [
  { id: "nd-1", cx: 432,  cy: 135 },
  { id: "nd-2", cx: 1224, cy: 135 },
  { id: "nd-3", cx: 432,  cy: 405 },
  { id: "nd-4", cx: 936,  cy: 405 },
  { id: "nd-5", cx: 1224, cy: 405 },
  { id: "nd-6", cx: 936,  cy: 720 },
  { id: "nd-7", cx: 1224, cy: 720 },
];

// ─── 5 source regions strictly bounded by the drawn lines ────────────────────
// Each region is an exact rectangle bounded by 4 lines.
const REGIONS = [
  {
    id: "left",
    x: 0,    y: 135, w: 432, h: 585,
    label: "SOURCE · 01",
    title: "核心架构设计规范_v4.pdf",
  },
  {
    id: "top-c",
    x: 432,  y: 135, w: 792, h: 270,
    label: "SOURCE · 02",
    title: "性能基准测试报告_2026Q1.pdf",
  },
  {
    id: "btm-cl",
    x: 432,  y: 405, w: 504, h: 315,
    label: "SOURCE · 03",
    title: "数据合规审计年度报告.docx",
  },
  {
    id: "btm-cr",
    x: 936,  y: 405, w: 288, h: 315,
    label: "SOURCE · 04",
    title: "模型微调实验日志.md",
  },
  {
    id: "right",
    x: 1224, y: 135, w: 216, h: 585,
    label: "SOURCE · 05",
    title: "分布式系统设计文档.pdf",
  },
] as const;

// ─── Phase type ────────────────────────────────────────────────────────────────
type Phase = "lineDrawing" | "panelRevealLocked" | "freeScroll";

// ─── Scroll constants ─────────────────────────────────────────────────────────
// Lines finish drawing after user scrolls 1.5× viewport height
const LINE_DRAW_VH = 1.5;
// Wheel pixel accumulation required to fully reveal all 5 panels
const REVEAL_WHEEL_TOTAL = 2500;

// ─── Knowledge graph node/edge data ──────────────────────────────────────────
const KG_NODES = [
  { id: "c0", x: 720,  y: 450, r: 46, type: "center" as const, label: "本次回答",   sub: "KNOWLEDGE NODE" },
  { id: "s1", x: 200,  y: 250, r: 27, type: "source" as const, label: "核心架构",   sub: "" },
  { id: "s2", x: 590,  y: 165, r: 27, type: "source" as const, label: "性能测试",   sub: "" },
  { id: "s3", x: 530,  y: 650, r: 27, type: "source" as const, label: "数据合规",   sub: "" },
  { id: "s4", x: 920,  y: 640, r: 27, type: "source" as const, label: "模型微调",   sub: "" },
  { id: "s5", x: 1200, y: 280, r: 27, type: "source" as const, label: "分布式系统", sub: "" },
  { id: "k1", x: 290,  y: 520, r: 17, type: "concept" as const, label: "架构设计",  sub: "" },
  { id: "k2", x: 860,  y: 185, r: 17, type: "concept" as const, label: "实验数据",  sub: "" },
  { id: "k3", x: 1065, y: 570, r: 17, type: "concept" as const, label: "系统优化",  sub: "" },
  { id: "k4", x: 380,  y: 715, r: 17, type: "concept" as const, label: "合规审计",  sub: "" },
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

  const phaseRef         = useRef<Phase>("lineDrawing");
  const lineDrawTlRef    = useRef<gsap.core.Timeline | null>(null);
  const revealTlRef      = useRef<gsap.core.Timeline | null>(null);
  const lockScrollTopRef = useRef(0);
  const wheelAccumRef    = useRef(0);

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
      if (fill)    gsap.set(fill,    { attr: { height: 0 } });
      if (content) gsap.set(content, { opacity: 0 });
    });

    // Build line draw timeline — paused, driven by scroll progress
    const tl = gsap.timeline({ paused: true });
    const q  = (id: string) => svg.querySelector<SVGLineElement>(`#${id}`);

    tl.to(q("tl-V-Main-L"),  { strokeDashoffset: 0, duration: 5, ease: LINE_DRAW_EASE }, 0);
    tl.to(q("tl-V-Main-R"),  { strokeDashoffset: 0, duration: 5, ease: LINE_DRAW_EASE }, "-=3");
    tl.to(q("tl-H-Main-T"),  { strokeDashoffset: 0, duration: 5, ease: LINE_DRAW_EASE }, "-=2");
    tl.to(q("tl-H-Main-B"),  { strokeDashoffset: 0, duration: 5, ease: LINE_DRAW_EASE }, "-=3");
    tl.to(q("tl-H-Aux-1"),   { strokeDashoffset: 0, duration: 4, ease: LINE_DRAW_EASE }, "-=1");
    tl.to(q("tl-V-Aux-1"),   { strokeDashoffset: 0, duration: 4, ease: LINE_DRAW_EASE }, "-=2");
    tl.to(q("tl-Deco-1"),    { strokeDashoffset: 0, duration: 2, ease: LINE_DRAW_EASE });
    tl.to(q("tl-Cross-1-H"), { strokeDashoffset: 0, duration: 2, ease: LINE_DRAW_EASE }, "-=2");
    tl.to(q("tl-Cross-1-V"), { strokeDashoffset: 0, duration: 2, ease: LINE_DRAW_EASE }, "-=2");
    tl.to(svg.querySelectorAll(".tl-node-dot"), {
      opacity: 1, scale: 1.5, yoyo: true, repeat: 1, duration: 1, stagger: 0.1,
    });

    lineDrawTlRef.current = tl;
    return () => { tl.kill(); };
  }, []);

  // ── All phase event-listener logic in one stable effect ────────────────────
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    // ── Phase 3: free scroll — SVG layer translates upward with canvas ──────
    let freeScrollCleanup: (() => void) | null = null;
    const startFreeScroll = () => {
      phaseRef.current = "freeScroll";
      setShowHint(false);

      const svgLayer = svgLayerRef.current;
      if (!svgLayer) return;

      const lockTop = lockScrollTopRef.current;
      const handleFreeScroll = () => {
        const delta = scroller.scrollTop - lockTop;
        gsap.set(svgLayer, { y: -delta });
      };

      freeScrollCleanup = () => scroller.removeEventListener("scroll", handleFreeScroll);
      scroller.addEventListener("scroll", handleFreeScroll, { passive: true });
    };

    // ── Phase 2: panel reveal locked — wheel drives GSAP timeline ───────────
    let wheelCleanup: (() => void) | null = null;
    const startPanelReveal = () => {
      const svg = svgRef.current;
      if (!svg) return;

      phaseRef.current           = "panelRevealLocked";
      lockScrollTopRef.current   = scroller.scrollTop;
      wheelAccumRef.current      = 0;
      setHint("继续滚动以显现溯源文件");

      // Build panel reveal timeline — paused, driven by wheel accumulation
      const revealTl = gsap.timeline({ paused: true });
      REGIONS.forEach(({ id, h }, i) => {
        const fill    = svg.querySelector(`#rf-${id}`);
        const content = svg.querySelector(`#rc-${id}`);
        const at      = i * 1.5;
        if (fill)    revealTl.to(fill,    { attr: { height: h }, duration: 1.2, ease: "power3.inOut" }, at);
        if (content) revealTl.to(content, { opacity: 1, duration: 0.8, ease: "power2.out" }, at + 0.9);
      });
      // Node dots appear during reveal
      revealTl.to(svg.querySelectorAll(".tl-node-dot"), {
        opacity: 1, scale: 1, stagger: 0.08, duration: 0.5, ease: "back.out(2)",
      }, 0.3);

      revealTlRef.current = revealTl;

      const handleWheel = (e: WheelEvent) => {
        if (phaseRef.current !== "panelRevealLocked") return;
        e.preventDefault();

        wheelAccumRef.current = Math.min(
          REVEAL_WHEEL_TOTAL,
          Math.max(0, wheelAccumRef.current + e.deltaY),
        );
        const progress = wheelAccumRef.current / REVEAL_WHEEL_TOTAL;
        revealTlRef.current?.progress(progress);

        if (progress >= 1) {
          wheelCleanup?.();
          wheelCleanup = null;
          startFreeScroll();
        }
      };

      wheelCleanup = () => scroller.removeEventListener("wheel", handleWheel);
      scroller.addEventListener("wheel", handleWheel, { passive: false });
    };

    // ── Phase 1: line drawing — scroll drives GSAP timeline ────────────────
    const handleLineScroll = () => {
      if (phaseRef.current !== "lineDrawing") return;
      const lineDrawEnd = window.innerHeight * LINE_DRAW_VH;
      const progress    = Math.min(scroller.scrollTop / lineDrawEnd, 1);
      lineDrawTlRef.current?.progress(progress);

      if (progress >= 1) {
        scroller.removeEventListener("scroll", handleLineScroll);
        startPanelReveal();
      }
    };

    scroller.addEventListener("scroll", handleLineScroll, { passive: true });

    return () => {
      scroller.removeEventListener("scroll", handleLineScroll);
      wheelCleanup?.();
      freeScrollCleanup?.();
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
           Position: absolute within fixed root (= visually fixed to viewport).
           In freeScroll phase, GSAP applies translateY to simulate canvas scroll. */}
      <div ref={svgLayerRef} className="trace-svg-layer" aria-hidden="true">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${TVW} ${TVH}`}
          preserveAspectRatio="xMidYMid slice"
          className="trace-frame-svg"
        >
          {/* ClipPaths: one per region, exactly bounded by the four surrounding lines */}
          <defs>
            {REGIONS.map(({ id, x, y, w, h }) => (
              <clipPath key={id} id={`clip-${id}`}>
                <rect x={x} y={y} width={w} height={h} />
              </clipPath>
            ))}
          </defs>

          {/* Region fill rects — wipe from top (height: 0 → h via GSAP) */}
          {REGIONS.map(({ id, x, y, w }) => (
            <rect
              key={id}
              id={`rf-${id}`}
              x={x} y={y} width={w} height={0}
              fill="rgba(39,255,100,0.045)"
            />
          ))}

          {/* Region content — clipped strictly inside the region bounds */}
          {REGIONS.map(({ id, x, y, w, h, label, title }) => {
            const cx  = x + w / 2;
            const cy  = y + h / 2;
            // Font sizes scale with region width to fit narrow columns
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

      {/* ── Long canvas scroll container (z-index 2, transparent) ─────────────
           Hero: 100vh  |  Stamp zone: 150vh  |  Graph: 100vh  =  350vh total
           maxScrollTop = 250vh → SVG exits exactly at max scroll */}
      <div ref={scrollerRef} className="trace-scroller">
        <div className="trace-canvas">

          {/* Section 1 — Hero header (100vh) */}
          <section className="trace-hero">
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

          {/* Section 2 — Stamp zone (150vh) — provides scroll distance for
               line drawing (0→150vh) and houses the locked reveal interaction */}
          <div className="trace-stamp-zone" aria-hidden="true" />

          {/* Section 3 — Knowledge graph (100vh) */}
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
