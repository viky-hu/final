"use client";

import { useMemo, useRef, useCallback, useState, useEffect } from "react";
import * as d3geo from "d3-geo";
import { gsap } from "gsap";
import { useGSAP } from "@gsap/react";
import type { GeoJsonProperties, Feature, FeatureCollection, Geometry } from "geojson";
import type { GeoPermissibleObjects } from "d3-geo";
import {
  BEACON_NODE_CONFIGS,
  BEACON_PERF_CONFIG,
  MACRO_NODES,
  SECTOR_NODES,
} from "../macroData";

gsap.registerPlugin(useGSAP);

// ── Constants ──────────────────────────────────────────────
const SVG_WIDTH = 800;
const SVG_HEIGHT = 800;
const PADDING = 20;
const LAYER_BOTTOM_Y = 20;
const LAYER_TOP_DEFAULT_Y = 0;
const LAYER_TOP_ACTIVE_Y = -40;
// Pin lift scaled to match plate's visual rise after rotateX(52deg): -40 × cos(52°) ≈ -25
const LAYER_TOP_ACTIVE_Y_PIN = Math.round(LAYER_TOP_ACTIVE_Y * Math.cos(52 * Math.PI / 180));
const MIDDLE_LAYER_COUNT = 15;
const COLOR_TOP_STROKE = "#5aafe0";
const RED_CENTER_NODE_ID = "node-center-red";

// ── New flat pin geometry ──────────────────────────────────
const PIN_HEAD_R = 46;
const PIN_STEM_H = 80;  // stem: bottom of circle → centroid tip
const PIN_INNER_R = 30;
const SWITCH_DURATION = 0.6;

function interpolateSideWall(idx: number, maxIdx: number): string {
  const c1 = [110, 170, 215];
  const c2 = [195, 228, 248];
  const t = idx / Math.max(1, maxIdx);
  return `rgb(${Math.round(c1[0] + t * (c2[0] - c1[0]))},${Math.round(c1[1] + t * (c2[1] - c1[1]))},${Math.round(c1[2] + t * (c2[2] - c1[2]))})`;
}

// ── Data maps ──────────────────────────────────────────────
const ADCODE_MAP: Record<number, string> = {
  320111: "node-current",
  320114: "node-2",
  320105: "node-3",
  320106: "node-4",
  320104: "node-5",
};

const NODE_TO_ADCODES = Object.entries(ADCODE_MAP).reduce((acc, [ad, node]) => {
  if (!acc[node]) acc[node] = [];
  acc[node].push(Number(ad));
  return acc;
}, {} as Record<string, number[]>);

NODE_TO_ADCODES[RED_CENTER_NODE_ID] = [320111];

const ALL_NODE_IDS = [...new Set([...Object.values(ADCODE_MAP), RED_CENTER_NODE_ID])];
const PLATE_NODE_IDS = [...new Set(Object.values(ADCODE_MAP))];

interface D3SandboxProps {
  visible: boolean;
  activeSectorId: string;
  selectedNodeId: string | null;
  onSectorChange: (sectorId: string) => void;
  onNodeSelect: (nodeId: string) => void;
}

interface DistrictItem {
  adcode: number;
  name: string;
  nodeId: string;
  pathD: string;
  centroidX: number;
  centroidY: number;
}

type PinTheme = "blue" | "red";

interface BeaconAnchor { nodeId: string; adcode: number; cx: number; cy: number; theme: PinTheme; }

interface D3PopupPayload {
  entity: string;
  type: string;
  description: string;
}

interface D3PopupLayout {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface D3PopupSpec {
  nodeId: string;
  isRed?: boolean;
  payload: D3PopupPayload;
  layout: D3PopupLayout;
}

const D3_POPUP_SPECS: Record<string, D3PopupSpec> = {
  "node-current": {
    nodeId: "node-current",
    layout: { x: 400, y: 50, width: 318, height: 260 },
    payload: {
      entity: "节点一 · SECTOR-01",
      type: "静态知识主库",
      description:
        "以公安领域静态知识为核心，涵盖各警种专业指导书籍、现行法律条文及官方释义、标准化警务规范，配套存储基础案件卷宗与警务通报等简易动态资料，贴合基础警务工作与专业研究需求。",
    },
  },
  "node-2": {
    nodeId: "node-2",
    layout: { x: 440, y: 60, width: 318, height: 260 },
    payload: {
      entity: "节点二 · SECTOR-02",
      type: "实战动态库",
      description:
        "聚焦公安实战动态数据，核心为警务实战过程中形成的动态资料，包含案件询问笔录、完整卷宗档案、警情原始通报，同步留存现场图像等多模态实战数据，配套法律适用细则与处置规范。",
    },
  },
  "node-3": {
    nodeId: "node-3",
    layout: { x: 460, y: 50, width: 318, height: 260 },
    payload: {
      entity: "节点三 · SECTOR-03",
      type: "综合融合库",
      description:
        "综合型公安数据节点，静态知识与动态实战资料均衡覆盖，静态侧收录跨领域融合类知识与研究成果，动态侧汇聚复杂案件全流程档案，兼顾研究参考与实战支撑双重需求。",
    },
  },
  "node-4": {
    nodeId: "node-4",
    layout: { x: 200, y: 55, width: 318, height: 260 },
    payload: {
      entity: "节点四 · SECTOR-04",
      type: "研判分析库",
      description:
        "专注情报研判与关联分析，存储跨案件关系网络、人员身份档案及行为轨迹数据，整合多源情报形成知识图谱，支撑专项行动方案生成与风险预警研判，为指挥决策提供数据支持。",
    },
  },
  "node-5": {
    nodeId: "node-5",
    layout: { x: 350, y: 45, width: 318, height: 260 },
    payload: {
      entity: "节点五 · SECTOR-05",
      type: "协作共享库",
      description:
        "跨部门协作数据共享节点，汇聚各警种协作办案记录与联合部署方案，存储跨区域案件协查资料、信息互通通报及联勤联动数据，确保多方协同作战的信息一致性与实时同步。",
    },
  },
  "node-center-red": {
    nodeId: "node-center-red",
    isRed: true,
    layout: { x: 450, y: 70, width: 318, height: 260 },
    payload: {
      entity: "中心节点",
      type: "当前服务器节点",
      description:
        "高权限综合管控节点，静态知识与动态实战档案深度融合，汇聚全网节点核心数据，整合加密传输通道与审计日志体系，统筹权限管控与节点互联，是整体数据体系的枢纽与指挥核心。",
    },
  },
};

// ── Laptop icon (flat, white strokes) ─────────────────────
function LaptopIcon({ cx, cy }: { cx: number; cy: number }) {
  const W = 34, SH = 21, BH = 6, BW = 40;
  const sx = cx - W / 2;
  const sy = cy - SH / 2 - BH / 2 - 1;
  const bx = cx - BW / 2;
  const by = sy + SH + 1.5;
  return (
    <g style={{ pointerEvents: "none" }}>
      <rect x={sx} y={sy} width={W} height={SH} rx={2.2}
        fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={2} />
      <rect x={sx + 3} y={sy + 3} width={W - 6} height={SH - 6} rx={0.8}
        fill="rgba(255,255,255,0.14)" />
      <path d={`M ${bx + 4} ${by} L ${bx + BW - 4} ${by} L ${bx + BW} ${by + BH} L ${bx} ${by + BH} Z`}
        fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={2} strokeLinejoin="round" />
      <rect x={cx - 7} y={by - 0.5} width={14} height={3} rx={1.5}
        fill="rgba(255,255,255,0.72)" />
    </g>
  );
}

function ServerHostIcon({ cx, cy }: { cx: number; cy: number }) {
  const bodyW = 25;
  const bodyH = 36;
  const bodyX = cx - 19;
  const bodyY = cy - 19;
  const dbR = 10;
  const dbCx = cx + 16;
  const dbCy = cy + 8;

  return (
    <g style={{ pointerEvents: "none" }}>
      <path
        d={`M ${bodyX + 2} ${bodyY + 2} L ${bodyX + bodyW - 3} ${bodyY - 4} L ${bodyX + bodyW - 3} ${bodyY + bodyH - 4} L ${bodyX + 2} ${bodyY + bodyH + 2} Z`}
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth={1.9}
        strokeLinejoin="round"
      />
      <path
        d={`M ${bodyX + 2} ${bodyY + 2} L ${bodyX - 4} ${bodyY - 1} L ${bodyX - 4} ${bodyY + bodyH + 4} L ${bodyX + 2} ${bodyY + bodyH + 2}`}
        fill="none"
        stroke="rgba(255,255,255,0.95)"
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <line
        x1={bodyX - 4}
        y1={bodyY - 1}
        x2={bodyX + bodyW - 3}
        y2={bodyY - 4}
        stroke="rgba(255,255,255,0.92)"
        strokeWidth={1.7}
      />
      <line
        x1={bodyX + 1}
        y1={bodyY + 20}
        x2={bodyX + bodyW - 6}
        y2={bodyY + 26}
        stroke="rgba(255,255,255,0.84)"
        strokeWidth={1.6}
      />
      <line
        x1={bodyX + 1}
        y1={bodyY + 26}
        x2={bodyX + bodyW - 6}
        y2={bodyY + 31}
        stroke="rgba(255,255,255,0.84)"
        strokeWidth={1.6}
      />
      <ellipse cx={dbCx} cy={dbCy} rx={dbR} ry={5.4} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={1.7} />
      <path d={`M ${dbCx - dbR} ${dbCy} L ${dbCx - dbR} ${dbCy + 13}`} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={1.7} />
      <path d={`M ${dbCx + dbR} ${dbCy} L ${dbCx + dbR} ${dbCy + 13}`} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={1.7} />
      <ellipse cx={dbCx} cy={dbCy + 8} rx={dbR} ry={5.4} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={1.7} />
      <ellipse cx={dbCx} cy={dbCy + 13} rx={dbR} ry={5.4} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={1.7} />
    </g>
  );
}

// ── New flat map pin (no 3D, no perspective) ───────────────
function MapPin({
  nodeId,
  cx,
  cy,
  theme,
  interactive,
  onSelect,
}: {
  nodeId: string;
  cx: number;
  cy: number;
  theme: PinTheme;
  interactive: boolean;
  onSelect: (nodeId: string) => void;
}) {
  const hcx = cx;
  // Head center sits PIN_STEM_H + PIN_HEAD_R above the centroid anchor
  const hcy = cy - PIN_STEM_H - PIN_HEAD_R;
  // Tail base sits at the exact bottom of the head circle
  const tailBaseY = hcy + PIN_HEAD_R;           // = cy - PIN_STEM_H
  const tailHalf = PIN_HEAD_R * 0.50;           // ~23 — clean taper
  const tailPath = `M ${cx} ${cy} L ${cx - tailHalf} ${tailBaseY} L ${cx + tailHalf} ${tailBaseY} Z`;
  const isRed = theme === "red";
  const tailGradId = isRed ? "pin-tail-grad-red" : "pin-tail-grad";
  const headGradId = isRed ? "pin-head-grad-red" : "pin-head-grad";
  const innerGradId = isRed ? "pin-inner-grad-red" : "pin-inner-grad";
  const ringOuterColor = isRed ? "rgba(255,112,112,0.9)" : "rgba(96,218,255,0.88)";
  const ringInnerColor = isRed ? "rgba(255,186,186,0.82)" : "rgba(195,248,255,0.80)";
  const pulseColor = isRed ? "rgba(248,82,82,0.76)" : "rgba(60,196,255,0.70)";
  const tipColor = isRed ? "rgba(255,142,142,0.96)" : "rgba(140,230,255,0.95)";

  return (
    <g
      id={`pin-g-${nodeId}`}
      style={{ pointerEvents: interactive ? "auto" : "none", cursor: interactive ? "pointer" : "default" }}
      onClick={(event) => {
        if (!interactive) return;
        event.stopPropagation();
        onSelect(nodeId);
      }}
    >
      {/* Tail pointing to centroid */}
      <path d={tailPath} fill={`url(#${tailGradId})`} />
      {/* Head outer fill */}
      <circle cx={hcx} cy={hcy} r={PIN_HEAD_R} fill={`url(#${headGradId})`} />
      {/* Static thin border */}
      <circle cx={hcx} cy={hcy} r={PIN_HEAD_R - 1.5}
        fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1.5} />
      {/* Inner circle */}
      <circle cx={hcx} cy={hcy} r={PIN_INNER_R} fill={`url(#${innerGradId})`} />
      {isRed ? <ServerHostIcon cx={hcx} cy={hcy} /> : <LaptopIcon cx={hcx} cy={hcy} />}
      {/* Active outer highlight ring — opacity animated by GSAP */}
      <circle id={`pin-active-outer-${nodeId}`} cx={hcx} cy={hcy}
        r={PIN_HEAD_R + 4} fill="none"
        stroke={ringOuterColor} strokeWidth={2.5} opacity={0} />
      {/* Active inner highlight ring */}
      <circle id={`pin-active-inner-${nodeId}`} cx={hcx} cy={hcy}
        r={PIN_INNER_R + 2.5} fill="none"
        stroke={ringInnerColor} strokeWidth={2} opacity={0} />
      {/* Pulse ring — animated by GSAP */}
      <circle id={`pin-pulse-${nodeId}`} cx={hcx} cy={hcy}
        r={PIN_HEAD_R + 8} fill="none"
        stroke={pulseColor} strokeWidth={2.4} opacity={0}
        strokeDasharray="12 8" strokeLinecap="round" />
      {/* Tip dot — sits exactly at centroid anchor */}
      <circle cx={cx} cy={cy} r={4.5} fill={tipColor} />
    </g>
  );
}

// ── Pin layer (always rendered AFTER plates — SVG paint order) ──
function PinLayer({
  anchors,
  activeNodeIds,
  onPinSelect,
}: {
  anchors: BeaconAnchor[];
  activeNodeIds: Set<string>;
  onPinSelect: (nodeId: string) => void;
}) {
  return (
    <g id="pin-layer">
      <defs>
        <linearGradient id="pin-tail-grad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#3eceff" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#0a50d8" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="pin-head-grad" cx="38%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#6ae0ff" />
          <stop offset="42%" stopColor="#1896f0" />
          <stop offset="100%" stopColor="#083ec0" />
        </radialGradient>
        <radialGradient id="pin-inner-grad" cx="42%" cy="35%" r="62%">
          <stop offset="0%" stopColor="rgba(212,250,255,0.90)" />
          <stop offset="55%" stopColor="rgba(22,140,238,0.62)" />
          <stop offset="100%" stopColor="rgba(8,58,192,0.42)" />
        </radialGradient>
        <linearGradient id="pin-tail-grad-red" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#ff8f8f" stopOpacity="0.96" />
          <stop offset="100%" stopColor="#c31f1f" stopOpacity="0.95" />
        </linearGradient>
        <radialGradient id="pin-head-grad-red" cx="38%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#ffc5c5" />
          <stop offset="42%" stopColor="#f35b5b" />
          <stop offset="100%" stopColor="#9e1313" />
        </radialGradient>
        <radialGradient id="pin-inner-grad-red" cx="42%" cy="35%" r="62%">
          <stop offset="0%" stopColor="rgba(255,238,238,0.9)" />
          <stop offset="55%" stopColor="rgba(246,98,98,0.62)" />
          <stop offset="100%" stopColor="rgba(154,16,16,0.42)" />
        </radialGradient>
      </defs>
      {anchors.map(({ nodeId, cx, cy, theme }) => {
        const cfg = BEACON_NODE_CONFIGS.find((c) => c.nodeId === nodeId);
        const ox = cfg?.anchorOffset.dx ?? 0;
        const oy = cfg?.anchorOffset.dy ?? 0;
        return (
          <MapPin
            key={nodeId}
            nodeId={nodeId}
            cx={cx + ox}
            cy={cy + oy}
            theme={theme}
            interactive={activeNodeIds.has(nodeId)}
            onSelect={onPinSelect}
          />
        );
      })}
    </g>
  );
}

// ── Main component ──────────────────────────────────────────
export function D3Sandbox({ visible, activeSectorId, selectedNodeId, onSectorChange, onNodeSelect }: D3SandboxProps) {
  const animationStateRef = useRef<"entering" | "ready">("entering");
  const currentTimelineRef = useRef<gsap.core.Timeline | null>(null);
  const previousSectorRef = useRef<string | null>(null);
  const [activePopupNodeId, setActivePopupNodeId] = useState<string | null>(null);
  const [exitingPopupNodeId, setExitingPopupNodeId] = useState<string | null>(null);
  const activePopupNodeIdRef = useRef<string | null>(null);
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mapWrapRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pulseTimelinesRef = useRef<Record<string, gsap.core.Timeline>>({});

  // ── GeoJSON projection + centroid compute ─────────────────
  const { districts, beaconAnchors } = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const geoJson = require("../nanjingDistricts.json") as FeatureCollection<Geometry, GeoJsonProperties>;
    const projection = d3geo.geoIdentity().reflectY(true).fitExtent(
      [[PADDING, PADDING], [SVG_WIDTH - PADDING, SVG_HEIGHT - PADDING]],
      geoJson as GeoPermissibleObjects,
    );
    const pathGen = d3geo.geoPath().projection(projection);
    const mapped: DistrictItem[] = geoJson.features
      .map((f: Feature<Geometry, GeoJsonProperties>) => {
        const adcode = (f.properties as { adcode: number }).adcode;
        const name = (f.properties as { name: string }).name;
        const d = pathGen(f) || "";
        const [cx = 0, cy = 0] = pathGen.centroid(f);
        return { adcode, name, nodeId: ADCODE_MAP[adcode] || "node-current", pathD: d, centroidX: cx, centroidY: cy };
      })
      .filter((item) => item.pathD.length > 0)
      .sort((a, b) => a.centroidY - b.centroidY);

    const seenNodes = new Set<string>();
    const anchors: BeaconAnchor[] = [];
    for (const d of mapped) {
      if (!seenNodes.has(d.nodeId)) {
        seenNodes.add(d.nodeId);
        anchors.push({ nodeId: d.nodeId, adcode: d.adcode, cx: d.centroidX, cy: d.centroidY, theme: "blue" });
      }
      if (d.nodeId === "node-current" && !seenNodes.has(RED_CENTER_NODE_ID)) {
        seenNodes.add(RED_CENTER_NODE_ID);
        anchors.push({ nodeId: RED_CENTER_NODE_ID, adcode: d.adcode, cx: d.centroidX, cy: d.centroidY, theme: "red" });
      }
    }
    return { districts: mapped, beaconAnchors: anchors };
  }, []);

  const activeNodeIds = useMemo(() => new Set(SECTOR_NODES[activeSectorId] ?? []), [activeSectorId]);

  // ── Plate click: switch sector (clears node selection via parent) ─
  const handlePlateClick = useCallback((plateNodeId: string) => {
    if (animationStateRef.current === "entering") return;
    onSectorChange(plateNodeId);
  }, [onSectorChange]);

  // ── Pin click: select specific node + open popup ────────────
  const handlePinClick = useCallback((nodeId: string) => {
    if (animationStateRef.current === "entering") return;
    onNodeSelect(nodeId);
  }, [onNodeSelect]);

  // ── Sync selectedNodeId → popup state ──────────────────────
  useEffect(() => {
    const newNodeId = selectedNodeId;
    const prev = activePopupNodeIdRef.current;
    if (prev !== null && prev !== newNodeId) {
      setExitingPopupNodeId(prev);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
      exitTimerRef.current = setTimeout(() => setExitingPopupNodeId(null), 220);
    }
    activePopupNodeIdRef.current = newNodeId;
    setActivePopupNodeId(newNodeId);
  }, [selectedNodeId]);

  useEffect(() => {
    if (!visible) {
      setActivePopupNodeId(null);
      setExitingPopupNodeId(null);
      activePopupNodeIdRef.current = null;
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    }
  }, [visible]);

  // ── Pulse helpers ──────────────────────────────────────────
  function _stopPulse(nodeId: string) {
    pulseTimelinesRef.current[nodeId]?.kill();
    delete pulseTimelinesRef.current[nodeId];
    const el = document.getElementById(`pin-pulse-${nodeId}`);
    if (el) gsap.set(el, { opacity: 0, attr: { r: PIN_HEAD_R + 8, "stroke-width": 2.4, "stroke-dashoffset": 0 } });
  }

  function _startPulse(nodeId: string) {
    _stopPulse(nodeId);
    const el = document.getElementById(`pin-pulse-${nodeId}`);
    if (!el) return;
    const tl = gsap.timeline({ repeat: -1, yoyo: true, delay: 0.2 });
    tl.fromTo(el,
      { opacity: 0.24, attr: { "stroke-width": 2.2, "stroke-dashoffset": 0 } },
      { opacity: 0.9, attr: { "stroke-width": 3.6, "stroke-dashoffset": -28 }, duration: 0.78, ease: "sine.inOut" },
    );
    pulseTimelinesRef.current[nodeId] = tl;
  }

  // ── Set plate positions for a given sectorId (immediate) ────
  function _applyPlatesImmediate(sectorId: string) {
    PLATE_NODE_IDS.forEach((nodeId) => {
      const isActive = nodeId === sectorId;
      const targetY  = isActive ? LAYER_TOP_ACTIVE_Y : LAYER_TOP_DEFAULT_Y;
      const adcodes  = NODE_TO_ADCODES[nodeId] || [];
      adcodes.forEach((adcode) => {
        gsap.set(`#d3-top-${adcode}`, { y: targetY });
        gsap.set(`#d3-hit-${adcode}`, { y: targetY });
        Array.from({ length: MIDDLE_LAYER_COUNT }, (_, i) => {
          const defaultY = LAYER_TOP_DEFAULT_Y + (i / (MIDDLE_LAYER_COUNT - 1)) * (LAYER_BOTTOM_Y - LAYER_TOP_DEFAULT_Y);
          const stretchY = targetY + (i / (MIDDLE_LAYER_COUNT - 1)) * (LAYER_BOTTOM_Y - targetY);
          gsap.set(`#d3-mid-${adcode}-${i}`, { y: isActive ? stretchY : defaultY });
        });
      });
    });
  }

  // ── Entry timeline ─────────────────────────────────────────
  useGSAP(() => {
    if (!visible) return;
    animationStateRef.current = "entering";

    // All pins start hidden
    ALL_NODE_IDS.forEach((nodeId) => {
      const el = document.getElementById(`pin-g-${nodeId}`);
      if (el) gsap.set(el, { y: LAYER_TOP_DEFAULT_Y, opacity: 0 });
      gsap.set(`#pin-active-outer-${nodeId}`, { opacity: 0 });
      gsap.set(`#pin-active-inner-${nodeId}`, { opacity: 0 });
      gsap.set(`#pin-pulse-${nodeId}`, { opacity: 0 });
    });

    const masterTl = gsap.timeline();

    if (headerRef.current) {
      masterTl.fromTo(headerRef.current,
        { autoAlpha: 0, y: -10 },
        { autoAlpha: 1, y: 0, duration: 0.5, ease: "power2.out" },
        "canvasReady",
      );
    }
    if (mapWrapRef.current) {
      masterTl.fromTo(mapWrapRef.current,
        { autoAlpha: 0, scale: 0.96 },
        { autoAlpha: 1, scale: 1, duration: 0.7, ease: "power2.out" },
        "canvasReady",
      );
    }

    // Apply plate states while canvas appears
    masterTl.call(() => { _applyPlatesImmediate(activeSectorId); }, [], "canvasReady+=0.45");

    // Stagger in only the active sector's nodes
    const activeSectorNodes = SECTOR_NODES[activeSectorId] ?? [];
    masterTl.addLabel("pinsIn", "canvasReady+=0.55");
    activeSectorNodes.forEach((nodeId, i) => {
      masterTl.to(`#pin-g-${nodeId}`,
        { y: LAYER_TOP_DEFAULT_Y, opacity: 0.82, duration: 0.5, ease: "power2.out" },
        `pinsIn+=${i * BEACON_PERF_CONFIG.staggerDelay}`,
      );
    });

    masterTl.addLabel("steady", "pinsIn+=0.9");
    masterTl.call(() => {
      animationStateRef.current = "ready";
      previousSectorRef.current = activeSectorId;
    }, [], "steady");

    return () => {
      Object.values(pulseTimelinesRef.current).forEach((tl) => tl.kill());
      pulseTimelinesRef.current = {};
    };
  }, { dependencies: [visible] });

  // ── Sector switch timeline ─────────────────────────────────
  useGSAP(() => {
    if (!visible || animationStateRef.current === "entering") return;
    if (previousSectorRef.current === activeSectorId) return;

    const prevSector = previousSectorRef.current;
    previousSectorRef.current = activeSectorId;

    currentTimelineRef.current?.kill();
    Object.values(pulseTimelinesRef.current).forEach((tl) => tl.kill());
    pulseTimelinesRef.current = {};

    const switchTl = gsap.timeline();
    currentTimelineRef.current = switchTl;

    // Fade out old sector's nodes
    if (prevSector) {
      const oldNodes = SECTOR_NODES[prevSector] ?? [];
      oldNodes.forEach((nodeId, i) => {
        switchTl.to(`#pin-g-${nodeId}`,
          { opacity: 0, y: LAYER_TOP_DEFAULT_Y + 10, duration: 0.3, ease: "power3.in" },
          i * 0.06,
        );
      });
    }

    // Clear all highlight rings
    ALL_NODE_IDS.forEach((nodeId) => {
      switchTl.to(`#pin-active-outer-${nodeId}`, { opacity: 0, duration: 0.2 }, 0);
      switchTl.to(`#pin-active-inner-${nodeId}`, { opacity: 0, duration: 0.2 }, 0);
      _stopPulse(nodeId);
    });

    // Animate plates
    PLATE_NODE_IDS.forEach((nodeId) => {
      const isActive = nodeId === activeSectorId;
      const targetY  = isActive ? LAYER_TOP_ACTIVE_Y : LAYER_TOP_DEFAULT_Y;
      const ease     = isActive ? "back.out(1.1)" : "power3.inOut";
      const adcodes  = NODE_TO_ADCODES[nodeId] || [];
      adcodes.forEach((adcode) => {
        switchTl.to(`#d3-top-${adcode}`, { y: targetY, duration: SWITCH_DURATION, ease }, 0.1);
        switchTl.to(`#d3-hit-${adcode}`, { y: targetY, duration: SWITCH_DURATION, ease }, 0.1);
        Array.from({ length: MIDDLE_LAYER_COUNT }, (_, i) => {
          const defaultY = LAYER_TOP_DEFAULT_Y + (i / (MIDDLE_LAYER_COUNT - 1)) * (LAYER_BOTTOM_Y - LAYER_TOP_DEFAULT_Y);
          const stretchY = targetY + (i / (MIDDLE_LAYER_COUNT - 1)) * (LAYER_BOTTOM_Y - targetY);
          switchTl.to(`#d3-mid-${adcode}-${i}`,
            { y: isActive ? stretchY : defaultY, duration: SWITCH_DURATION, ease: "power3.inOut" }, 0.1);
        });
        const filterEl = document.getElementById(`glow-filter-${adcode}`);
        const feBlur = filterEl?.querySelector("feGaussianBlur");
        if (feBlur) {
          const proxy = { val: parseFloat(feBlur.getAttribute("stdDeviation") || "0") };
          switchTl.to(proxy, {
            val: isActive ? 3.2 : 0,
            duration: SWITCH_DURATION * 1.4,
            ease: "power2.out",
            onUpdate() { feBlur.setAttribute("stdDeviation", proxy.val.toFixed(2)); },
          }, 0.1);
        }
      });
    });

    // Fade in new sector's nodes
    const newNodes = SECTOR_NODES[activeSectorId] ?? [];
    newNodes.forEach((nodeId, i) => {
      switchTl.to(`#pin-g-${nodeId}`,
        { opacity: 0.82, y: LAYER_TOP_DEFAULT_Y, duration: 0.45, ease: "power2.out" },
        0.35 + i * 0.1,
      );
    });
  }, { dependencies: [visible, activeSectorId] });

  // ── Node highlight timeline ────────────────────────────────
  useGSAP(() => {
    if (!visible || animationStateRef.current === "entering") return;

    // Stop all pulses first
    ALL_NODE_IDS.forEach((nodeId) => { _stopPulse(nodeId); });

    if (!selectedNodeId) {
      // Clear all highlight rings
      ALL_NODE_IDS.forEach((nodeId) => {
        gsap.to(`#pin-active-outer-${nodeId}`, { opacity: 0, duration: 0.25 });
        gsap.to(`#pin-active-inner-${nodeId}`, { opacity: 0, duration: 0.25 });
      });
      // Reset position/opacity only for the active sector's nodes (others remain hidden)
      const activeSectorNodes = SECTOR_NODES[activeSectorId] ?? [];
      activeSectorNodes.forEach((nodeId) => {
        gsap.to(`#pin-g-${nodeId}`, { y: LAYER_TOP_DEFAULT_Y, opacity: 0.82, duration: 0.3, ease: "power2.inOut" });
      });
      return;
    }

    // Highlight selected node, dim others (only within active sector)
    const activeSectorNodes = SECTOR_NODES[activeSectorId] ?? [];
    const highlightTl = gsap.timeline({ onComplete: () => { _startPulse(selectedNodeId); } });

    activeSectorNodes.forEach((nodeId) => {
      const isSelected = nodeId === selectedNodeId;
      highlightTl.to(`#pin-g-${nodeId}`,
        { y: isSelected ? LAYER_TOP_ACTIVE_Y_PIN : LAYER_TOP_DEFAULT_Y, opacity: isSelected ? 1 : 0.45, duration: SWITCH_DURATION * 0.7, ease: "power2.out" }, 0);
      highlightTl.to(`#pin-active-outer-${nodeId}`, { opacity: isSelected ? 1 : 0, duration: SWITCH_DURATION * 0.55 }, 0);
      highlightTl.to(`#pin-active-inner-${nodeId}`, { opacity: isSelected ? 1 : 0, duration: SWITCH_DURATION * 0.55 }, 0);
    });
  }, { dependencies: [visible, selectedNodeId] });

  return (
    <div className="w-full h-full relative" style={{ backgroundColor: "transparent" }}>
      <header ref={headerRef} className="d1tl-header d3viz-header">
        <span className="d1tl-header-dot d3viz-dot" />
        <span className="d1tl-header-title">核心地域态势</span>
      </header>

      <div
        ref={mapWrapRef}
        className="w-full h-full pt-16 flex items-center justify-center invisible relative"
      >
        {/* Background grid */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: "200%", height: "200%",
            backgroundSize: "60px 60px",
            backgroundImage: "linear-gradient(to right, rgba(0,160,220,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,160,220,0.04) 1px, transparent 1px)",
            transform: "perspective(1000px) rotateX(52deg) rotateZ(-15deg) translate(-10%,-20%)",
          }}
        />

        <div
          className="flex items-center justify-center relative z-10"
          style={{
            transform: "perspective(1000px) rotateX(52deg) rotateZ(-15deg)",
            transformStyle: "preserve-3d",
            width: "85%",
            aspectRatio: "1",
          }}
        >
          <svg
            viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
            width="100%"
            height="100%"
            style={{ overflow: "visible", position: "relative", zIndex: 1 }}
          >
            <defs>
              <pattern id="d3-iso-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,160,220,0.05)" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="d3-top-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#dff0fa" stopOpacity="1" />
                <stop offset="55%"  stopColor="#b8d9f0" stopOpacity="0.97" />
                <stop offset="100%" stopColor="#e8f5fd" stopOpacity="0.92" />
              </linearGradient>
              <filter id="d3-neon-edge" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="d3-bottom-shadow" x="-15%" y="-15%" width="130%" height="160%">
                <feDropShadow dx="0" dy="6" stdDeviation="5"
                  floodColor="rgba(90,150,200,0.16)" floodOpacity="1" />
              </filter>
              {districts.map((d) => (
                <filter key={`glow-${d.adcode}`} id={`glow-filter-${d.adcode}`}
                  x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="0" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>

            <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#d3-iso-grid)" />

            {/* Plates layer — rendered FIRST so pin-layer is always on top */}
            <g id="plates-layer">
              {districts.map((district) => (
                <g
                  key={district.adcode}
                  id={`group-adcode-${district.adcode}`}
                  className="district-group cursor-pointer"
                  onClick={() => handlePlateClick(district.nodeId)}
                >
                  <path
                    id={`d3-hit-${district.adcode}`}
                    d={district.pathD}
                    fill="rgba(0, 0, 0, 0.001)"
                    stroke="none"
                    transform={`translate(0, ${LAYER_TOP_DEFAULT_Y})`}
                  />
                  <path
                    d={district.pathD}
                    fill="#c2d8ec"
                    stroke="none"
                    transform={`translate(0, ${LAYER_BOTTOM_Y})`}
                    filter="url(#d3-bottom-shadow)"
                  />
                  {Array.from({ length: MIDDLE_LAYER_COUNT }, (_, idx) => {
                    const defaultY = LAYER_TOP_DEFAULT_Y + (idx / (MIDDLE_LAYER_COUNT - 1)) * (LAYER_BOTTOM_Y - LAYER_TOP_DEFAULT_Y);
                    return (
                      <path
                        key={`mid-${district.adcode}-${idx}`}
                        id={`d3-mid-${district.adcode}-${idx}`}
                        d={district.pathD}
                        fill={interpolateSideWall(MIDDLE_LAYER_COUNT - 1 - idx, MIDDLE_LAYER_COUNT - 1)}
                        stroke="none"
                        transform={`translate(0, ${defaultY})`}
                        filter={`url(#glow-filter-${district.adcode})`}
                      />
                    );
                  })}
                  <path
                    id={`d3-top-${district.adcode}`}
                    d={district.pathD}
                    fill="url(#d3-top-gradient)"
                    stroke={COLOR_TOP_STROKE}
                    strokeWidth={1.2}
                    transform={`translate(0, ${LAYER_TOP_DEFAULT_Y})`}
                    filter="url(#d3-neon-edge)"
                  />
                  <DistrictLabel
                    district={district}
                    isSelected={selectedNodeId != null ? (NODE_TO_ADCODES[selectedNodeId] || []).includes(district.adcode) : (NODE_TO_ADCODES[activeSectorId] || []).includes(district.adcode)}
                  />
                </g>
              ))}
            </g>

          </svg>

          {/* ── Pin overlay: counter-rotated so pins appear completely upright ──
               Parent: perspective(1000px) rotateX(52°) rotateZ(-15°)
               Child:  rotateZ(15°) rotateX(-52°)
               Net:    perspective(1000px) only → SVG at z=0 → zero distortion ── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              transform: "translateZ(40px) rotateZ(15deg) rotateX(-52deg)",
              transformOrigin: "50% 50%",
              pointerEvents: "none",
              willChange: "transform",
            }}
          >
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              width="100%"
              height="100%"
              style={{ overflow: "visible", pointerEvents: "none" }}
            >
              <PinLayer anchors={beaconAnchors} activeNodeIds={activeNodeIds} onPinSelect={handlePinClick} />
            </svg>
          </div>

          <div
            className="d3viz-popup-overlay"
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 45,
              transform: "translateZ(96px) rotateZ(15deg) rotateX(-52deg)",
              transformOrigin: "50% 50%",
              pointerEvents: "none",
              willChange: "transform",
            }}
          >
            <svg
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              width="100%"
              height="100%"
              style={{ overflow: "visible" }}
              aria-label="D3 实体信息弹窗"
            >
              {exitingPopupNodeId && D3_POPUP_SPECS[exitingPopupNodeId] ? (
                <D3EntityPopup key={`exit-${exitingPopupNodeId}`} spec={D3_POPUP_SPECS[exitingPopupNodeId]} isExiting />
              ) : null}
              {activePopupNodeId && D3_POPUP_SPECS[activePopupNodeId] ? (
                <D3EntityPopup key={`enter-${activePopupNodeId}`} spec={D3_POPUP_SPECS[activePopupNodeId]} />
              ) : null}
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

function D3EntityPopup({ spec, isExiting }: { spec: D3PopupSpec; isExiting?: boolean }) {
  const { x, y, width, height } = spec.layout;
  const cardClass = [
    isExiting ? 'card card--exiting' : 'card',
    spec.isRed ? 'card--red' : '',
  ].filter(Boolean).join(' ');

  return (
    <g className="d3popup-root" transform={`translate(${x} ${y})`} aria-hidden="true">
      <foreignObject x={0} y={0} width={width} height={height} overflow="visible" pointerEvents="auto">
        <div className={cardClass}>
          <p className="card-title">{spec.payload.entity}</p>
          <p className="small-desc">{spec.payload.description}</p>
        </div>
      </foreignObject>
    </g>
  );
}

// ── District label ──────────────────────────────────────────
function DistrictLabel({ district, isSelected }: { district: DistrictItem; isSelected: boolean }) {
  const textRef = useRef<SVGTextElement>(null);

  useGSAP(() => {
    if (!textRef.current) return;
    gsap.to(textRef.current, {
      y: isSelected ? LAYER_TOP_ACTIVE_Y : LAYER_TOP_DEFAULT_Y,
      duration: SWITCH_DURATION,
      ease: isSelected ? "back.out(1.1)" : "power3.inOut",
    });
  }, [isSelected]);

  return (
    <text
      ref={textRef}
      x={district.centroidX}
      y={district.centroidY}
      className="pointer-events-none select-none"
      style={{
        fontFamily: '"DingTalk JinBuTi", system-ui, sans-serif',
        fontWeight: isSelected ? 700 : 500,
        letterSpacing: "0.08em",
      }}
      fontSize={isSelected ? "20px" : "15px"}
      fill={isSelected ? "#0077cc" : "rgba(30,80,140,0.72)"}
      textAnchor="middle"
    >
      {MACRO_NODES.find((n) => n.id === district.nodeId)?.labelCode ?? district.nodeId}
    </text>
  );
}
