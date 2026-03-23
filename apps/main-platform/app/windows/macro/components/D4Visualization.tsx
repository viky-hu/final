"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { gsap } from "gsap";

/* ── 时间段类型 ── */
type Period = "最近" | "24小时" | "7天内" | "30天内";
const PERIODS: Period[] = ["最近", "24小时", "7天内", "30天内"];

/* ── 不同时间段的配置：颜色 & 渐变 ── */
const PERIOD_CONFIGS: Record<Period, { stroke: string; gradient: [string, string] }> = {
  "最近": { stroke: "#0891b2", gradient: ["#22d3ee", "#06b6d4"] },
  "24小时": { stroke: "#6366f1", gradient: ["#818cf8", "#4f46e5"] },
  "7天内": { stroke: "#10b981", gradient: ["#34d399", "#059669"] },
  "30天内": { stroke: "#f43f5e", gradient: ["#fb7185", "#e11d48"] },
};

interface D4VisualizationProps {
  /** 为 true 时开始渲染内部内容（由父组件在画布完全展开后传入） */
  visible: boolean;
}

interface DataPoint {
  time: string;
  value: number; // 0 - 100
}

export function D4Visualization({ visible }: D4VisualizationProps) {
  const [period, setPeriod] = useState<Period>("最近");
  const [animKey, setAnimKey] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const areaRef = useRef<SVGPathElement>(null);
  const pointsRef = useRef<(SVGCircleElement | null)[]>([]);
  const labelsRef = useRef<SVGGElement>(null);

  const [hasAnimatedFirstTime, setHasAnimatedFirstTime] = useState(false);

  // 1. 根据当前选择的时间段生成模拟数据
  const data: DataPoint[] = useMemo(() => {
    const now = new Date();
    const points: DataPoint[] = [];
    
    // 伪随机值生成 - 增加起伏差异性
    const generateValue = (index: number, p: Period) => {
        const base = p === "最近" ? 30 : p === "24小时" ? 40 : p === "7天内" ? 55 : 65;
        // 短时间段（最近、24H）波动更大
        const amplitude = (p === "最近" || p === "24小时") ? 35 : 15;
        const seed = index + (p === "最近" ? 0.8 : p === "24小时" ? 1.2 : 0.5);
        const variation = Math.sin(seed * (p === "最近" ? 2.5 : 1.5)) * amplitude + Math.random() * amplitude;
        return Math.min(95, Math.max(5, base + variation));
    };

    if (period === "最近") {
      for (let i = 4; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 3600000);
        points.push({ time: `${d.getHours()}:00`, value: generateValue(i, period) });
      }
    } else if (period === "24小时") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 4 * 3600000);
        points.push({ time: `${d.getHours()}:00`, value: generateValue(i, period) });
      }
    } else if (period === "7天内") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 3600000);
        points.push({ time: `${d.getMonth() + 1}/${d.getDate()}`, value: generateValue(i, period) });
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 5 * 24 * 3600000);
        points.push({ time: `${d.getMonth() + 1}/${d.getDate()}`, value: generateValue(i, period) });
      }
    }
    return points;
  }, [period]);

  // 2. 坐标计算 (终极大幅调大尺寸)
  const width = 800; 
  const height = 500;
  const padding = { top: 30, right: 80, bottom: 65, left: 80 }; // 维持右侧 clearance

  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const getX = (i: number) => padding.left + (i / (data.length - 1)) * chartW;
  const getY = (v: number) => padding.top + chartH - (v / 100) * chartH;
  const getBaseY = () => padding.top + chartH;

  // 3. 生成贝塞尔曲线路径
  const curvePath = useMemo(() => {
    if (data.length < 2) return "";
    let d = `M ${getX(0)} ${getY(data[0].value)}`;

    for (let i = 0; i < data.length - 1; i++) {
        const x1 = getX(i);
        const y1 = getY(data[i].value);
        const x2 = getX(i + 1);
        const y2 = getY(data[i + 1].value);

        const cp1x = x1 + (x2 - x1) * 0.45;
        const cp2x = x1 + (x2 - x1) * 0.55;

        d += ` C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
    }
    return d;
  }, [data]);

  const areaPath = useMemo(() => {
    if (!curvePath) return "";
    return `${curvePath} L ${getX(data.length - 1)} ${getBaseY()} L ${getX(0)} ${getBaseY()} Z`;
  }, [curvePath, data]);

  const currentConfig = PERIOD_CONFIGS[period];

  // 4. GSAP 动画执行函数
  const runAnimation = useCallback((isFirstTime = false) => {
    if (!rootRef.current) return;

    const tl = gsap.timeline();
    const baseY = getBaseY();

    // 如果是切换，先做一个简单的重置或渐隐
    if (!isFirstTime) {
      tl.to([pathRef.current, areaRef.current, pointsRef.current], { 
        opacity: 0, 
        duration: 0.2, 
        ease: "power2.out" 
      });
    }

    // 标题与选择器淡入 (仅首次)
    if (isFirstTime) {
      if (headerRef.current) tl.to(headerRef.current, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0);
      if (selectorRef.current) tl.to(selectorRef.current, { autoAlpha: 1, duration: 0.4, ease: "power2.out" }, 0.1);
    }

    // 坐标轴标签动画
    if (labelsRef.current) {
        const children = labelsRef.current.children;
        tl.fromTo(children,
            { opacity: 0, x: -10 },
            { opacity: 1, x: 0, duration: 0.4, stagger: 0.03, ease: "power2.out" },
            isFirstTime ? 0.15 : 0
        );
    }

    // 曲线推升 reveal 动画
    if (pathRef.current && areaRef.current) {
        tl.fromTo([pathRef.current, areaRef.current],
            { scaleY: 0, opacity: 0, transformOrigin: `0px ${baseY}px` },
            { scaleY: 1, opacity: 1, duration: 0.8, ease: "power3.out" },
            isFirstTime ? 0.4 : 0.2
        );
    }

    // 数据点弹出
    if (pointsRef.current.length) {
        const validPoints = pointsRef.current.filter(Boolean);
        tl.fromTo(validPoints,
            { scale: 0, opacity: 0, transformOrigin: "center center" },
            { scale: 1, opacity: 1, duration: 0.4, stagger: 0.08, ease: "back.out(1.7)" },
            isFirstTime ? 0.7 : 0.5
        );
    }
  }, [data]);

  useEffect(() => {
    if (!visible) return;
    if (!hasAnimatedFirstTime) {
      setHasAnimatedFirstTime(true);
      runAnimation(true);
    } else {
      runAnimation(false);
    }
  }, [visible, animKey, runAnimation, hasAnimatedFirstTime]);

  const handlePeriodChange = (p: Period) => {
    if (p === period) return;
    setPeriod(p);
    setAnimKey(prev => prev + 1);
  };

  if (!visible) return null;

  return (
    <div ref={rootRef} className="d4viz-root" aria-label="个人节点数据库价值监测">
      {/* ── 标题栏 (仅标题) ── */}
      <header ref={headerRef} className="d1tl-header d4viz-header" style={{ opacity: 0, visibility: "hidden" }}>
        <span className="d1tl-header-dot d4viz-dot" />
        <span className="d1tl-header-title">节点数据库价值监测</span>
      </header>

      {/* ── 时间段选择器独立行 ── */}
      <div ref={selectorRef} className="d4viz-period-row" style={{ opacity: 0, visibility: "hidden" }}>
        <div className="d4viz-period-selector" role="group" aria-label="时间段选择">
          {PERIODS.map((p) => (
            <button
              key={p}
              className={`d4viz-period-btn${p === period ? " d4viz-period-btn--active" : ""}`}
              onClick={() => handlePeriodChange(p)}
              aria-pressed={p === period}
            >
              <span className="d4viz-period-btn-text">{p}</span>
              {p === period && <span className="d4viz-period-btn-bar" />}
            </button>
          ))}
        </div>
      </div>

      {/* ── SVG 曲线区域 (填满剩余空间) ── */}
      <div className="d4viz-chart-container">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="d4viz-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <linearGradient id="d4-gradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={currentConfig.gradient[0]} stopOpacity="0.6" />
              <stop offset="100%" stopColor={currentConfig.gradient[1]} stopOpacity="0" />
            </linearGradient>
            <filter id="d4-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 轴组 */}
          <g ref={labelsRef} className="d4viz-axis-group">
            <line x1={padding.left} y1={padding.top} x2={padding.left} y2={getBaseY()} stroke="rgba(30,25,25,0.06)" strokeWidth="1" />
            <line x1={padding.left} y1={getBaseY()} x2={width - padding.right} y2={getBaseY()} stroke="rgba(30,25,25,0.06)" strokeWidth="1" />

            {data.map((pt, i) => (
              <text
                key={`${period}-x-${i}`}
                x={getX(i)}
                y={getBaseY() + 28}
                textAnchor="middle"
                className="d4viz-axis-text"
                style={{ fontSize: '18px' }}
              >
                {pt.time}
              </text>
            ))}

            {[0, 50, 100].map(v => (
              <text
                key={`y-${v}`}
                x={padding.left - 15}
                y={getY(v) + 7}
                textAnchor="end"
                className="d4viz-axis-text"
                style={{ fontSize: '18px' }}
              >
                {v}%
              </text>
            ))}
          </g>

          {/* 填充区域 */}
          <path
            ref={areaRef}
            d={areaPath}
            fill="url(#d4-gradient)"
            style={{ opacity: 0 }}
          />

          {/* 曲线 */}
          <path
            ref={pathRef}
            d={curvePath}
            fill="none"
            stroke={currentConfig.stroke}
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
            filter="url(#d4-glow)"
            style={{ opacity: 0 }}
          />

          {/* 数据点 */}
          {data.map((pt, i) => (
            <circle
              key={`${period}-p-${i}`}
              ref={el => { pointsRef.current[i] = el; }}
              cx={getX(i)}
              cy={getY(pt.value)}
              r="6.5"
              fill="#ffffff"
              stroke={currentConfig.stroke}
              strokeWidth="3.5"
              style={{ opacity: 0 }}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
